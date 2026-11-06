-- =============================================================
-- Socion: Socionics Signal newsletter opt-in
-- Migration: 20261106120000_socionics_signal_opt_in.sql
--
-- Socionics Signal is Spencer's email newsletter, run from
-- socionicsinsight.com on the same MailerLite account (group
-- "Socionics Insight - Socionics Signal"). Members can now subscribe from
-- the feed's "New on Socionics Insight" card and the right sidebar's
-- "From the founder" card.
--
-- This is a separate purpose from "Socion updates" (marketing_opt_in):
-- agreeing to one says nothing about the other, so it gets its own columns
-- and its own rows in the consent audit log. Wording is archived in
-- docs/policies/consent-text-v2.md (consent_text_version 'v2'); the v1
-- Socion-updates wording is unchanged and still recorded as 'v1'.
--
-- Pieces:
--   * users.signal_opt_in / signal_opt_in_at / signal_consent_source
--       NULL = never answered, TRUE = subscribed, FALSE = unsubscribed.
--       Pinned by protect_sensitive_user_columns() like the marketing columns.
--   * consent_events.purpose  'socion_updates' (every existing row) or
--       'socionics_signal'. New source values for the two Signal capture
--       points.
--   * record_signal_opt_in()  service-role writer, called by the
--       subscribe-signal edge function only after MailerLite has accepted
--       the subscriber, so the record never claims a subscription that
--       didn't happen.
--   * suppress_email()  a MailerLite unsubscribe, bounce or complaint is
--       account-wide in MailerLite, so it now ends the Signal subscription
--       record as well as Socion updates.
-- =============================================================


-- -----------------------------------------------------------------------
-- 1. Columns on users
-- -----------------------------------------------------------------------
alter table public.users
  add column if not exists signal_opt_in         boolean,
  add column if not exists signal_opt_in_at      timestamptz,
  add column if not exists signal_consent_source text;

alter table public.users
  drop constraint if exists users_signal_consent_source_check;
alter table public.users
  add constraint users_signal_consent_source_check
  check (signal_consent_source is null or signal_consent_source in (
    'signal_feed_card_v1', 'signal_sidebar_v1',
    'mailerlite_unsubscribe', 'email_unsubscribe_link'
  ));


-- -----------------------------------------------------------------------
-- 2. consent_events: purpose column and new sources
--
-- Adding a column with a default back-fills every existing row as
-- 'socion_updates', which is what they all are. ALTER TABLE ... ADD COLUMN
-- is not an UPDATE, so the append-only trigger doesn't fire.
-- -----------------------------------------------------------------------
alter table public.consent_events
  add column if not exists purpose text not null default 'socion_updates';

alter table public.consent_events
  drop constraint if exists consent_events_purpose_check;
alter table public.consent_events
  add constraint consent_events_purpose_check
  check (purpose in ('socion_updates', 'socionics_signal'));

alter table public.consent_events
  drop constraint if exists consent_events_source_check;
alter table public.consent_events
  add constraint consent_events_source_check
  check (source in (
    'signup_v1', 'in_app_prompt_v1', 'settings',
    'signal_feed_card_v1', 'signal_sidebar_v1',
    'mailerlite_unsubscribe', 'email_unsubscribe_link'
  ));


-- -----------------------------------------------------------------------
-- 3. Pin the new columns against direct end-user writes
--
-- Carries forward the whole of the 20261018120000 definition unchanged and
-- adds the three Signal columns to both branches.
-- -----------------------------------------------------------------------
create or replace function protect_sensitive_user_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    if new.type_source not in ('unset', 'self_reported') then
      new.type_source := 'unset';
    end if;
    new.marketing_opt_in         := null;
    new.marketing_opt_in_at      := null;
    new.marketing_consent_source := null;
    new.signal_opt_in            := null;
    new.signal_opt_in_at         := null;
    new.signal_consent_source    := null;
    new.verified_by              := null;
    new.room_muted_until         := null;
    return new;
  end if;

  -- TG_OP = 'UPDATE'
  new.is_founding_member             := old.is_founding_member;
  new.plan_status                    := old.plan_status;
  new.stripe_customer_id             := old.stripe_customer_id;
  new.stripe_subscription_id         := old.stripe_subscription_id;
  new.premium_started_at             := old.premium_started_at;
  new.premium_current_period_end     := old.premium_current_period_end;
  new.referral_code                  := old.referral_code;
  new.referred_by_user_id            := old.referred_by_user_id;
  new.referral_premium_until         := old.referral_premium_until;
  new.referral_premium_days_granted  := old.referral_premium_days_granted;
  new.referral_count_qualified       := old.referral_count_qualified;
  new.type_source                    := old.type_source;
  new.marketing_opt_in               := old.marketing_opt_in;
  new.marketing_opt_in_at            := old.marketing_opt_in_at;
  new.marketing_consent_source       := old.marketing_consent_source;
  new.signal_opt_in                  := old.signal_opt_in;
  new.signal_opt_in_at               := old.signal_opt_in_at;
  new.signal_consent_source          := old.signal_consent_source;
  new.email_notifications            := old.email_notifications;
  new.email_notifications_updated_at := old.email_notifications_updated_at;
  new.verified_by                    := old.verified_by;
  new.room_muted_until               := old.room_muted_until;
  new.auth_id                        := old.auth_id;
  new.created_at                     := old.created_at;
  if new.type is not distinct from old.type then
    new.room_id := old.room_id;
  end if;

  new.profile_data := jsonb_set(
    coalesce(new.profile_data, '{}'::jsonb),
    '{role}',
    coalesce(old.profile_data->'role', 'null'::jsonb)
  );

  return new;
end;
$$;


-- -----------------------------------------------------------------------
-- 4. record_signal_opt_in(): service-role writer
--
-- Called by supabase/functions/subscribe-signal after MailerLite accepted
-- the subscriber. The edge function has already verified the caller's JWT
-- and resolved p_user_id from it; this function re-reads the email from
-- auth.users rather than trusting one passed in.
--
-- No-op (no event row) if the member is already subscribed from the same
-- source, so retries don't pad the audit log.
--
-- An 'unsubscribed' suppression is left in place: it governs Socion updates
-- (can_send_marketing), and subscribing to Signal is not consent to those.
-- -----------------------------------------------------------------------
create or replace function public.record_signal_opt_in(p_user_id uuid, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      text;
  v_current    boolean;
  v_cur_source text;
begin
  if p_source is null or p_source not in ('signal_feed_card_v1', 'signal_sidebar_v1') then
    raise exception 'record_signal_opt_in: invalid source %', p_source;
  end if;

  select lower(au.email), u.signal_opt_in, u.signal_consent_source
    into v_email, v_current, v_cur_source
  from users u
  join auth.users au on au.id = u.auth_id
  where u.id = p_user_id
  for update of u;

  if not found then
    raise exception 'record_signal_opt_in: no profile %', p_user_id;
  end if;

  if v_current is true and v_cur_source is not distinct from p_source then
    return;
  end if;

  update users
     set signal_opt_in         = true,
         signal_opt_in_at      = now(),
         signal_consent_source = p_source
   where id = p_user_id;

  insert into consent_events (user_id, email, marketing_opt_in, source, consent_text_version, purpose)
  values (p_user_id, v_email, true, p_source, 'v2', 'socionics_signal');
end;
$$;

revoke execute on function public.record_signal_opt_in(uuid, text) from public, anon, authenticated;
grant  execute on function public.record_signal_opt_in(uuid, text) to service_role;


-- -----------------------------------------------------------------------
-- 5. suppress_email(): also end a Signal subscription
--
-- Same contract as 20260930120000 (idempotent, returns TRUE if a member's
-- preference changed). For a MailerLite opt-out it now also sets
-- signal_opt_in = FALSE and writes a separate 'socionics_signal' event when
-- the member was subscribed.
-- consent_events.marketing_opt_in holds the answer for the event's purpose.
-- -----------------------------------------------------------------------
create or replace function public.suppress_email(p_email text, p_reason text, p_source text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := lower(trim(p_email));
  v_user_id uuid;
  v_mkt     boolean;
  v_sig     boolean;
  v_changed boolean := false;
begin
  if v_email is null or v_email = '' or position('@' in v_email) = 0 then
    raise exception 'suppress_email: invalid email';
  end if;
  if p_reason not in ('unsubscribed', 'bounced', 'complained') then
    raise exception 'suppress_email: invalid reason %', p_reason;
  end if;
  if p_source not in ('mailerlite_unsubscribe', 'email_unsubscribe_link') then
    raise exception 'suppress_email: invalid source %', p_source;
  end if;

  insert into email_suppressions (email, reason, source)
  values (v_email, p_reason, p_source)
  on conflict (email) do nothing;

  -- Lock the member row so two concurrent deliveries can't both log a change.
  select u.id, u.marketing_opt_in, u.signal_opt_in
    into v_user_id, v_mkt, v_sig
  from users u
  join auth.users au on au.id = u.auth_id
  where lower(au.email) = v_email
  for update of u;

  if v_user_id is null then
    return false;
  end if;

  if v_mkt is distinct from false then
    update users
       set marketing_opt_in         = false,
           marketing_opt_in_at      = now(),
           marketing_consent_source = p_source
     where id = v_user_id;

    insert into consent_events (user_id, email, marketing_opt_in, source, consent_text_version, purpose)
    values (v_user_id, v_email, false, p_source, null, 'socion_updates');
    v_changed := true;
  end if;

  -- Only a MailerLite opt-out ends Signal: MailerLite unsubscribes are
  -- account-wide, so the member really has stopped receiving it. The
  -- unsubscribe link in Socion's own Resend emails doesn't touch MailerLite,
  -- so it leaves the Signal subscription (and this record of it) alone.
  -- Only a member who actually subscribed gets a Signal event; NULL stays NULL.
  if v_sig is true and p_source = 'mailerlite_unsubscribe' then
    update users
       set signal_opt_in         = false,
           signal_opt_in_at      = now(),
           signal_consent_source = p_source
     where id = v_user_id;

    insert into consent_events (user_id, email, marketing_opt_in, source, consent_text_version, purpose)
    values (v_user_id, v_email, false, p_source, null, 'socionics_signal');
    v_changed := true;
  end if;

  return v_changed;
end;
$$;

revoke execute on function public.suppress_email(text, text, text) from public, anon, authenticated;
grant  execute on function public.suppress_email(text, text, text) to service_role;
