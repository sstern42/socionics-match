-- =============================================================
-- Socion — Move email_notifications out of profile_data
-- Migration: 20260930130000_email_notifications_column.sql
--
-- The "Email notifications" toggle on /profile/notifications was stored as
-- profile_data.email_notifications. It moves to a real column, with a
-- timestamp, alongside the marketing-consent columns from 20260930120000, so
-- the two preferences are recorded the same way and can't be confused.
--
-- Note: nothing in this repo reads the value. No edge function, trigger or
-- migration sends message or connection emails; those notifications are
-- push-only (send-push, via the messages INSERT webhook). The column records
-- the member's choice so any future sender has one to honour.
--
-- Existing values are carried over. A member who never touched the toggle has
-- no key, which the client already treated as TRUE, so the column defaults to
-- TRUE and the timestamp stays NULL for them. Members who did save the page
-- get their saved value; the true save time was never recorded, so their
-- timestamp is the migration time.
--
-- The write goes through set_email_notifications() rather than a direct
-- UPDATE so the timestamp is always set server-side; the two columns are
-- pinned in protect_sensitive_user_columns() like the marketing columns.
-- =============================================================

alter table public.users
  add column if not exists email_notifications            boolean not null default true,
  add column if not exists email_notifications_updated_at timestamptz;

-- Carry existing values over, then drop the key from profile_data.
-- Runs as the migration owner, so protect_sensitive_user_columns() lets it
-- through; enforce_unique_display_name() returns early because the name is
-- unchanged. Guarded on the key's presence so a re-run is a no-op.
update public.users
   set email_notifications            = coalesce((profile_data->>'email_notifications')::boolean, true),
       email_notifications_updated_at = now(),
       profile_data                   = profile_data - 'email_notifications'
 where profile_data ? 'email_notifications';


-- Carries forward 20260930120000 and adds the two new columns to the UPDATE
-- branch. INSERT is left alone: a sign-up choosing FALSE is harmless, and the
-- client never sends it.
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
  new.email_notifications            := old.email_notifications;
  new.email_notifications_updated_at := old.email_notifications_updated_at;

  new.profile_data := jsonb_set(
    coalesce(new.profile_data, '{}'::jsonb),
    '{role}',
    coalesce(old.profile_data->'role', 'null'::jsonb)
  );

  return new;
end;
$$;


-- Caller derived from auth.uid(); no user id parameter.
create or replace function public.set_email_notifications(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_enabled is null then
    raise exception 'set_email_notifications: p_enabled must be true or false';
  end if;

  update users
     set email_notifications            = p_enabled,
         email_notifications_updated_at = now()
   where auth_id = auth.uid()
     and email_notifications is distinct from p_enabled;
end;
$$;

revoke execute on function public.set_email_notifications(boolean) from public, anon;
grant  execute on function public.set_email_notifications(boolean) to authenticated;
