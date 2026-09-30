-- =============================================================
-- Socion — Filter admin email exports and the sign-up nudge by consent
-- Migration: 20260930140000_consent_filtered_email_exports.sql
--
-- Depends on 20260930120000_email_marketing_consent.sql.
--
-- 1. get_member_emails() — the Admin "Member emails" Copy/Export, which is
--    the list that goes into MailerLite. Now returns only members who pass
--    the same test as can_send_marketing(): explicitly opted in, not
--    suppressed, not banned. Signature and founder check unchanged from
--    20260803140000, so the grants carry over.
--
-- 2. get_inactive_users() — gains a marketing_ok column so the Admin panel
--    can keep listing every inactive member (it's a monitoring view) while
--    Copy/Export only hands out the consented ones. Changing the return type
--    needs DROP + CREATE, so the grants from 20260702150000 are re-applied.
--
-- 3. get_abandoned_signups() — skips anyone in email_suppressions, so a
--    person who used the unsubscribe link in the reminder (or any other
--    Socion email) isn't sent it again. Signature unchanged.
--
-- 4. SECURITY FIX found while testing this migration: get_abandoned_signups()
--    and claim_abandoned_signup_nudge() were executable by anon. 20260706120000
--    revoked EXECUTE from PUBLIC only, but Supabase's default privileges on
--    the public schema also grant EXECUTE on every new function to anon and
--    authenticated *explicitly*, and revoking from PUBLIC doesn't touch
--    those. get_abandoned_signups() reads auth.users and has no caller check,
--    so an unauthenticated POST /rest/v1/rpc/get_abandoned_signups with the
--    public anon key returned the email of everyone who started signing up in
--    the last 30 days without finishing (minus those already nudged). The
--    same shape of defect as get_member_emails() in 20260803140000.
--    claim_abandoned_signup_nudge() let anyone mark a person as already
--    nudged. Both are now revoked from anon and authenticated; only the
--    service role (the notify-abandoned-signup function) keeps EXECUTE.
--    Reproduced on a Postgres 16 rebuild with Supabase's default privileges;
--    check production's ACL with:
--      select proname, proacl from pg_proc
--      where proname in ('get_abandoned_signups','claim_abandoned_signup_nudge');
--
-- get_incomplete_signups() is deliberately left alone: those people have no
-- users row, so none of them can have given marketing consent and a consent
-- filter would always return nothing. The Admin page labels that export as
-- not for marketing instead.
-- =============================================================


-- -----------------------------------------------------------------------
-- 1. get_member_emails()
-- -----------------------------------------------------------------------
create or replace function public.get_member_emails()
returns table(id uuid, email text, name text, type text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from users
    where auth_id = auth.uid()
      and profile_data->>'role' = 'founder'
  ) then
    raise exception 'Forbidden';
  end if;

  -- Inlined rather than calling can_send_marketing() per row; keep the two
  -- in step if either changes.
  return query
    select
      pu.id,
      au.email::text,
      (pu.profile_data->>'name')::text,
      pu.type,
      pu.created_at
    from public.users pu
    inner join auth.users au on au.id = pu.auth_id
    where pu.marketing_opt_in is true
      and not exists (
        select 1 from email_suppressions s where s.email = lower(au.email)
      )
      and not exists (
        select 1 from banned_emails b where lower(b.email) = lower(au.email)
      )
    order by pu.created_at desc;
end;
$$;

revoke execute on function public.get_member_emails() from public, anon;


-- -----------------------------------------------------------------------
-- 2. get_inactive_users() — add marketing_ok
-- -----------------------------------------------------------------------
drop function if exists public.get_inactive_users(int);

create function public.get_inactive_users(days_threshold int default 30)
returns table (
  id uuid,
  email text,
  name text,
  type text,
  created_at timestamptz,
  last_active timestamptz,
  marketing_ok boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from users
    where auth_id = auth.uid()
      and profile_data->>'role' = 'founder'
  ) then
    raise exception 'Forbidden';
  end if;

  -- Explicit casts: RETURN QUERY needs exact type matches (auth.users.email
  -- is varchar(255)); see 20260702150000.
  return query
    select
      u.id,
      au.email::text as email,
      (u.profile_data->>'name')::text as name,
      u.type::text as type,
      u.created_at::timestamptz as created_at,
      u.last_active::timestamptz as last_active,
      (
        u.marketing_opt_in is true
        and not exists (
          select 1 from email_suppressions s where s.email = lower(au.email)
        )
      ) as marketing_ok
    from users u
    join auth.users au on au.id = u.auth_id
    where u.last_active < now() - (days_threshold || ' days')::interval
      and not exists (
        select 1 from banned_emails be
        where lower(be.email) = lower(au.email)
      )
    order by u.last_active asc;
end;
$$;

revoke all on function public.get_inactive_users(int) from public, anon;
grant execute on function public.get_inactive_users(int) to authenticated;


-- -----------------------------------------------------------------------
-- 3. get_abandoned_signups() — skip suppressed addresses
-- -----------------------------------------------------------------------
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
    and not exists (
      select 1 from public.email_suppressions s where s.email = lower(u.email)
    )
  order by u.created_at desc
  limit p_limit;
$$;



-- -----------------------------------------------------------------------
-- 4. Close anon/authenticated EXECUTE on the nudge functions (see header)
-- -----------------------------------------------------------------------
revoke all on function public.get_abandoned_signups(interval, interval, int) from public, anon, authenticated;
revoke all on function public.claim_abandoned_signup_nudge(uuid)             from public, anon, authenticated;
grant execute on function public.get_abandoned_signups(interval, interval, int) to service_role;
grant execute on function public.claim_abandoned_signup_nudge(uuid)             to service_role;
