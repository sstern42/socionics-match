-- =============================================================
-- Socion: unsubscribe from Socionics Signal in Settings
-- Migration: 20261106130000_signal_settings_unsubscribe.sql
--
-- Adds a Signal toggle to Profile -> Notifications. Turning it off calls the
-- unsubscribe-signal edge function, which removes the member from the
-- MailerLite Signal group only (not an account-wide MailerLite unsubscribe,
-- so Socion updates are untouched) and then records it here.
--
-- Pieces:
--   * 'settings' allowed as a signal_consent_source (consent_events already
--       allows it, from 20260930120000).
--   * record_signal_opt_out()  service-role writer, called only after
--       MailerLite has removed the member from the group.
--
-- An opt-out has no consent wording, so consent_text_version is NULL, as for
-- the other opt-outs. Subscribing again is through the existing capture
-- points (record_signal_opt_in(), 20261106120000), which reappear in the feed
-- once signal_opt_in is FALSE.
-- =============================================================


-- -----------------------------------------------------------------------
-- 1. Allow 'settings' as a Signal consent source
-- -----------------------------------------------------------------------
alter table public.users
  drop constraint if exists users_signal_consent_source_check;
alter table public.users
  add constraint users_signal_consent_source_check
  check (signal_consent_source is null or signal_consent_source in (
    'signal_feed_card_v1', 'signal_sidebar_v1', 'settings',
    'mailerlite_unsubscribe', 'email_unsubscribe_link'
  ));


-- -----------------------------------------------------------------------
-- 2. record_signal_opt_out(): service-role writer
--
-- Called by supabase/functions/unsubscribe-signal. The edge function has
-- verified the caller's JWT and resolved p_user_id from it; the email is
-- re-read from auth.users rather than trusted from the caller.
--
-- No-op (no event row) unless the member is currently subscribed, so retries
-- and double clicks don't pad the audit log. Returns TRUE if it changed.
-- -----------------------------------------------------------------------
create or replace function public.record_signal_opt_out(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text;
  v_current boolean;
begin
  select lower(au.email), u.signal_opt_in
    into v_email, v_current
  from users u
  join auth.users au on au.id = u.auth_id
  where u.id = p_user_id
  for update of u;

  if not found then
    raise exception 'record_signal_opt_out: no profile %', p_user_id;
  end if;

  if v_current is not true then
    return false;
  end if;

  update users
     set signal_opt_in         = false,
         signal_opt_in_at      = now(),
         signal_consent_source = 'settings'
   where id = p_user_id;

  insert into consent_events (user_id, email, marketing_opt_in, source, consent_text_version, purpose)
  values (p_user_id, v_email, false, 'settings', null, 'socionics_signal');

  return true;
end;
$$;

revoke execute on function public.record_signal_opt_out(uuid) from public, anon, authenticated;
grant  execute on function public.record_signal_opt_out(uuid) to service_role;
