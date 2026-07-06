-- =============================================================
-- Socion — Abandoned-signup nudge (issue #964)
-- Migration: 20260706120000_abandoned_signup_nudge.sql
--
-- Users who authenticate (OAuth / magic-link) but never finish
-- ProfileSetup.jsx end up in auth.users with no matching
-- public.users row (that row is created in createProfile(),
-- src/lib/profile.js). Nothing follows up with them today.
--
-- This adds the plumbing for a single "finish setting up your
-- profile" transactional nudge, sent by the `notify-abandoned-signup`
-- edge function. It's transactional (tied to an action the user took
-- — starting signup) rather than marketing, which sidesteps the
-- missing marketing-consent column flagged in
-- 20260702160000_onboarding_typing_chat.sql.
--
-- Pieces:
--   * abandoned_signup_nudges — one row per auth_id we've nudged, so
--     the send is strictly one-time (never recurring).
--   * get_abandoned_signups() — finds candidates: auth.users with no
--     public.users row, not yet nudged, with a usable email, inside a
--     [older_than, newer_than] age window so a first run doesn't blast
--     the entire historical backlog.
--   * claim_abandoned_signup_nudge() — atomically records the nudge and
--     reports whether this caller won the claim (guards against a
--     retried/concurrent cron run double-sending).
--
-- All three functions are SECURITY DEFINER because they read auth.users,
-- which PostgREST doesn't expose to the anon/authenticated roles. They
-- are locked to the service_role only (see GRANTs below), so the browser
-- can never reach them.
-- =============================================================

-- One row per auth user we've sent the nudge to. Presence of a row is the
-- "already nudged" marker; cascade so it's cleaned up if the auth user is
-- deleted. RLS on with no policies → only the service_role (which bypasses
-- RLS) can touch it.
create table if not exists public.abandoned_signup_nudges (
  auth_id   uuid primary key references auth.users(id) on delete cascade,
  nudged_at timestamptz not null default now()
);

alter table public.abandoned_signup_nudges enable row level security;

-- Candidates for the nudge. Excludes anyone who already finished (has a
-- public.users row), was already nudged, has no email, or is banned/deleted.
-- The age window keeps the first cron run from emailing every historical
-- half-signup at once: only accounts created between p_newer_than and
-- p_older_than ago are eligible.
create or replace function public.get_abandoned_signups(
  p_older_than interval default '24 hours',
  p_newer_than interval default '30 days',
  p_limit      int      default 200
)
returns table (auth_id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email
  from auth.users u
  left join public.users p                    on p.auth_id = u.id
  left join public.abandoned_signup_nudges n  on n.auth_id = u.id
  where p.id is null
    and n.auth_id is null
    and u.email is not null
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until < now())
    and u.created_at < now() - p_older_than
    and u.created_at > now() - p_newer_than
  order by u.created_at desc
  limit p_limit;
$$;

-- Atomically claim a single candidate: insert the nudge row and report
-- whether we were the one who inserted it. A concurrent/retried run that
-- races us gets `false` here and skips the send.
create or replace function public.claim_abandoned_signup_nudge(p_auth_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with ins as (
    insert into public.abandoned_signup_nudges (auth_id)
    values (p_auth_id)
    on conflict (auth_id) do nothing
    returning auth_id
  )
  select exists (select 1 from ins);
$$;

-- Lock everything to the service_role. Revoke the default PUBLIC execute
-- grant so anon/authenticated can never call these (they read auth.users).
revoke all on function public.get_abandoned_signups(interval, interval, int) from public;
revoke all on function public.claim_abandoned_signup_nudge(uuid) from public;
grant execute on function public.get_abandoned_signups(interval, interval, int) to service_role;
grant execute on function public.claim_abandoned_signup_nudge(uuid) to service_role;

-- =============================================================
-- Scheduling (run manually in the Supabase SQL editor, same pattern as
-- stats.sql / daily-digest / seed-room-prompt — pg_cron + a vault-stored
-- service-role secret). Once a day is plenty; each candidate is nudged
-- exactly once (guarded by abandoned_signup_nudges), so re-runs are cheap
-- no-ops for anyone already emailed.
--
-- Requires (one-time, already set up for daily-digest):
--   - pg_cron enabled (Database → Extensions)
--   - vault secret 'service_role_key' holding PROJECT_SECRET_KEY
--
--   select cron.schedule(
--     'notify-abandoned-signup',
--     '32 15 * * *',   -- once daily, mid-afternoon UTC
--     $$
--       select net.http_post(
--         url     := 'https://<project-ref>.supabase.co/functions/v1/notify-abandoned-signup',
--         headers := jsonb_build_object(
--           'Content-Type',  'application/json',
--           'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--         ),
--         body    := '{}'::jsonb
--       );
--     $$
--   );
-- =============================================================
