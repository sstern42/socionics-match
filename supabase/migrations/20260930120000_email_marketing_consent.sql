-- =============================================================
-- Socion — Marketing-email consent, suppressions and audit log
-- Migration: 20260930120000_email_marketing_consent.sql
--
-- Until now there was nowhere to record whether a member had agreed to
-- marketing email. 20260702150000_get_inactive_users.sql and
-- 20260706120000_abandoned_signup_nudge.sql both flagged the gap, and the
-- Admin "Member emails" export handed out every address regardless. This
-- adds the record, and the only supported ways to change it.
--
-- Pieces:
--   * users.marketing_opt_in / marketing_opt_in_at / marketing_consent_source
--       Real columns, not profile_data keys, so they can be constrained,
--       indexed, and pinned by the protect trigger. NULL opt-in means the
--       member has never been asked; TRUE/FALSE means they answered.
--   * email_suppressions — addresses we must not send non-transactional
--       email to, keyed on the lowercased address rather than a user id so it
--       also covers people with no public.users row (abandoned sign-ups) and
--       survives account deletion.
--   * consent_events — append-only audit log. Every change of preference
--       writes one row, so what a member agreed to, when, and through which
--       wording can be reconstructed later (wording is archived under
--       docs/policies/, keyed by consent_text_version).
--   * set_marketing_preference() — the one client-callable writer.
--   * can_send_marketing() — the one question every sender asks.
--   * suppress_email() — service-side writer for unsubscribe links and the
--       MailerLite webhook.
--
-- Lockdown: the three new users columns are pinned by
-- protect_sensitive_user_columns() for direct end-user sessions (INSERT and
-- UPDATE), the same mechanism that protects plan_status, type_source etc.
-- set_marketing_preference() is SECURITY DEFINER, so current_user inside it is
-- the owner rather than 'authenticated' and its write passes the trigger.
--
-- Known limitation, not changed here: "Users: read all profiles"
-- (20260527130000) lets any signed-in member SELECT every users row, so these
-- columns are readable by other members, as plan_status already is. Narrowing
-- that needs column-level grants on users, which would break the client's
-- select('*') reads and is out of scope.
-- =============================================================


-- -----------------------------------------------------------------------
-- 1. Columns on users
-- -----------------------------------------------------------------------
alter table public.users
  add column if not exists marketing_opt_in         boolean,
  add column if not exists marketing_opt_in_at      timestamptz,
  add column if not exists marketing_consent_source text;

alter table public.users
  drop constraint if exists users_marketing_consent_source_check;
alter table public.users
  add constraint users_marketing_consent_source_check
  check (marketing_consent_source is null or marketing_consent_source in (
    'signup_v1', 'in_app_prompt_v1', 'settings',
    'mailerlite_unsubscribe', 'email_unsubscribe_link'
  ));


-- -----------------------------------------------------------------------
-- 2. email_suppressions
--
-- RLS on with no policies: only the service role and SECURITY DEFINER
-- functions below can touch it. reason separates a preference
-- ('unsubscribed') from a deliverability signal ('bounced', 'complained'),
-- because opting back in should clear the first but not the other two.
-- -----------------------------------------------------------------------
create table if not exists public.email_suppressions (
  email      text primary key check (email = lower(email)),
  reason     text not null default 'unsubscribed'
             check (reason in ('unsubscribed', 'bounced', 'complained')),
  source     text,
  created_at timestamptz not null default now()
);

alter table public.email_suppressions enable row level security;
revoke all on table public.email_suppressions from public, anon, authenticated;
grant all on table public.email_suppressions to service_role;


-- -----------------------------------------------------------------------
-- 3. consent_events — append-only
--
-- No FK to users: like account_deletions_log (20260629120000), the point is
-- that the record outlives the account. email is stored alongside user_id for
-- the same reason, and because webhook events may match no users row at all.
-- -----------------------------------------------------------------------
create table if not exists public.consent_events (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid,
  email                text,
  marketing_opt_in     boolean not null,
  source               text not null check (source in (
                         'signup_v1', 'in_app_prompt_v1', 'settings',
                         'mailerlite_unsubscribe', 'email_unsubscribe_link'
                       )),
  consent_text_version text,
  created_at           timestamptz not null default now()
);

create index if not exists consent_events_user_id_idx on public.consent_events (user_id);
create index if not exists consent_events_email_idx   on public.consent_events (email);

alter table public.consent_events enable row level security;
-- Supabase's default privileges grant ALL on new tables to service_role, so
-- take back everything but SELECT/INSERT explicitly. TRUNCATE matters most:
-- it skips row-level triggers, so the trigger below can't catch it.
revoke all on table public.consent_events from public, anon, authenticated, service_role;
grant select, insert on table public.consent_events to service_role;

-- Append-only: refuse UPDATE and DELETE at row level as well, in case a
-- grant is ever widened. (The table owner can still drop the trigger; this
-- guards against accidents and application code, not the database owner.)
create or replace function public.consent_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'consent_events is append-only';
end;
$$;

drop trigger if exists consent_events_no_update_delete on public.consent_events;
create trigger consent_events_no_update_delete
  before update or delete on public.consent_events
  for each row
  execute function public.consent_events_append_only();


-- -----------------------------------------------------------------------
-- 4. Pin the new columns against direct end-user writes
--
-- Carries forward the whole of the 20260702170000 definition unchanged and
-- adds the three marketing columns to both branches. On INSERT they are
-- forced to NULL, so a crafted sign-up can't arrive already "consented" with
-- a timestamp of its choosing; the real answer is written straight after by
-- set_marketing_preference(..., 'signup_v1').
-- -----------------------------------------------------------------------
create or replace function protect_sensitive_user_columns()
returns trigger
language plpgsql
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

  new.profile_data := jsonb_set(
    coalesce(new.profile_data, '{}'::jsonb),
    '{role}',
    coalesce(old.profile_data->'role', 'null'::jsonb)
  );

  return new;
end;
$$;


-- -----------------------------------------------------------------------
-- 5. set_marketing_preference() — the only client-facing writer
--
-- Derives the caller from auth.uid() (no user id parameter), as
-- set_self_reported_type() and the referral RPCs do. Only the three
-- user-initiated sources are accepted here; the two unsubscribe sources are
-- reserved for suppress_email(), which only the service role can call.
--
-- consent_text_version is 'v1' for every source this function accepts: the
-- sign-up checkbox, the in-app prompt and the Settings toggle wording are
-- archived together in docs/policies/consent-text-v1.md. Changing any of
-- that wording means a new version string here and a new archive file.
--
-- Opting in clears an 'unsubscribed' suppression (the member has changed
-- their mind) but deliberately leaves 'bounced' and 'complained' in place:
-- those say the address can't or shouldn't be mailed, whatever the
-- preference.
--
-- No-op (no event row) when the answer is unchanged, so double-clicks and
-- retries don't pad the audit log. An unchanged answer from a different
-- source is still logged, since it is a fresh affirmation.
-- -----------------------------------------------------------------------
create or replace function public.set_marketing_preference(p_opt_in boolean, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid;
  v_email      text;
  v_current    boolean;
  v_cur_source text;
begin
  if p_opt_in is null then
    raise exception 'set_marketing_preference: p_opt_in must be true or false';
  end if;

  if p_source is null or p_source not in ('signup_v1', 'in_app_prompt_v1', 'settings') then
    raise exception 'set_marketing_preference: invalid source %', p_source;
  end if;

  select u.id, lower(au.email), u.marketing_opt_in, u.marketing_consent_source
    into v_user_id, v_email, v_current, v_cur_source
  from users u
  join auth.users au on au.id = u.auth_id
  where u.auth_id = auth.uid()
  for update of u;

  if v_user_id is null then
    raise exception 'set_marketing_preference: no profile for caller';
  end if;

  if v_current is not distinct from p_opt_in and v_cur_source is not distinct from p_source then
    return;
  end if;

  update users
     set marketing_opt_in         = p_opt_in,
         marketing_opt_in_at      = now(),
         marketing_consent_source = p_source
   where id = v_user_id;

  insert into consent_events (user_id, email, marketing_opt_in, source, consent_text_version)
  values (v_user_id, v_email, p_opt_in, p_source, 'v1');

  if v_email is not null then
    if p_opt_in then
      delete from email_suppressions
       where email = v_email
         and reason = 'unsubscribed';
    else
      insert into email_suppressions (email, reason, source)
      values (v_email, 'unsubscribed', p_source)
      on conflict (email) do nothing;
    end if;
  end if;
end;
$$;

revoke execute on function public.set_marketing_preference(boolean, text) from public, anon;
grant  execute on function public.set_marketing_preference(boolean, text) to authenticated;


-- -----------------------------------------------------------------------
-- 6. can_send_marketing() — the one check every non-transactional sender uses
--
-- TRUE only for a member who has explicitly opted in, whose address is not
-- suppressed for any reason, and who isn't banned (the banned_emails check
-- mirrors get_inactive_users()).
--
-- service_role only. Granting it to authenticated would turn it into a
-- membership oracle: "is this address a Socion member?" for any address.
-- -----------------------------------------------------------------------
create or replace function public.can_send_marketing(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
      select 1
      from users u
      join auth.users au on au.id = u.auth_id
      where lower(au.email) = lower(trim(p_email))
        and u.marketing_opt_in is true
    )
    and not exists (
      select 1 from email_suppressions s where s.email = lower(trim(p_email))
    )
    and not exists (
      select 1 from banned_emails b where lower(b.email) = lower(trim(p_email))
    );
$$;

revoke execute on function public.can_send_marketing(text) from public, anon, authenticated;
grant  execute on function public.can_send_marketing(text) to service_role;


-- -----------------------------------------------------------------------
-- 7. suppress_email() — service-side writer for unsubscribes and bounces
--
-- Used by the email-unsubscribe and mailerlite-webhook edge functions.
-- Idempotent, so webhook retries are safe:
--   * the suppression insert is ON CONFLICT DO NOTHING (the first reason
--     recorded wins; a later 'complained' does not overwrite 'unsubscribed');
--   * the users row is only updated, and a consent_events row only written,
--     when the member isn't already opted out.
-- Returns TRUE if a matching member's preference was changed.
--
-- Every reason sets marketing_opt_in = FALSE for a matching member: a bounce
-- or complaint is not a preference, but mailing that member again is exactly
-- what has to stop.
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
  select u.id into v_user_id
  from users u
  join auth.users au on au.id = u.auth_id
  where lower(au.email) = v_email
    and u.marketing_opt_in is distinct from false
  for update of u;

  if v_user_id is null then
    return false;
  end if;

  update users
     set marketing_opt_in         = false,
         marketing_opt_in_at      = now(),
         marketing_consent_source = p_source
   where id = v_user_id;

  insert into consent_events (user_id, email, marketing_opt_in, source, consent_text_version)
  values (v_user_id, v_email, false, p_source, null);

  return true;
end;
$$;

revoke execute on function public.suppress_email(text, text, text) from public, anon, authenticated;
grant  execute on function public.suppress_email(text, text, text) to service_role;


-- -----------------------------------------------------------------------
-- 8. is_email_suppressed() — for transactional-adjacent sends
--
-- notify-abandoned-signup mails people who have no users row, so
-- can_send_marketing() (which requires an opt-in) would always be FALSE for
-- them. That reminder is sent on the "started signing up" relationship, and
-- only has to respect an unsubscribe. service_role only, for the same
-- membership-oracle reason as can_send_marketing().
-- -----------------------------------------------------------------------
create or replace function public.is_email_suppressed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from email_suppressions where email = lower(trim(p_email))
  );
$$;

revoke execute on function public.is_email_suppressed(text) from public, anon, authenticated;
grant  execute on function public.is_email_suppressed(text) to service_role;
