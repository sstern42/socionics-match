-- =============================================================
-- Socion — Security fixes for RPCs that existed only in production
-- Migration: 20260803140000_harden_production_only_rpcs.sql
--
-- These four functions were created by hand in the SQL editor and never
-- committed, so they have never been reviewed in a pull request. They were
-- surfaced by the audit in supabase/PRODUCTION_ONLY_OBJECTS.md (issue #972)
-- and their definitions dumped from production with pg_get_functiondef().
-- All four are SECURITY DEFINER and all four were executable by PUBLIC and
-- anon — and the anon key ships in the frontend bundle by design, so anon
-- means anyone on the internet, with no account.
--
-- The two admin functions are the same defect get_admin_stats() had, fixed in
-- 20260623120000_get_admin_stats_role_check.sql: the client gates the Admin
-- page, nothing gated the function. Its two neighbours on that page were
-- missed then because they are not in this repo. They carry the same founder
-- check now.
--
-- The other two follow 20260623123000 / 20260623124000: derive the caller
-- from auth.uid() server-side rather than trusting a parameter. Signatures are
-- unchanged so no client callsite needs touching.
--
-- Scope note: only the four functions that needed changes are defined here.
-- The other seven audited RPCs are clean, but committing them means also
-- committing saved_profiles and message_reactions, which no migration creates
-- and whose real column and policy definitions still have to come from
-- production. That is tracked in PRODUCTION_ONLY_OBJECTS.md and left to a
-- follow-up, so this migration stays reviewable and replays cleanly.
-- =============================================================


-- -----------------------------------------------------------------------
-- 1. get_member_emails() — was returning every member's email to anyone
--
-- No authorisation check of any kind. Joined public.users to auth.users and
-- returned id, email, name, type and signup date for every member. A single
-- unauthenticated POST to /rest/v1/rpc/get_member_emails dumped the entire
-- membership list with email addresses.
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

  return query
    select
      pu.id,
      au.email::text,
      (pu.profile_data->>'name')::text,
      pu.type,
      pu.created_at
    from public.users pu
    inner join auth.users au on au.id = pu.auth_id
    order by pu.created_at desc;
end;
$$;


-- -----------------------------------------------------------------------
-- 2. get_incomplete_signups() — same defect, reading auth.users directly
--
-- Returned the email of everyone who started signing up in the last 7 days
-- without completing a profile. Same lack of any check, same exposure.
-- -----------------------------------------------------------------------
create or replace function public.get_incomplete_signups()
returns table(id uuid, email text, created_at timestamptz)
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

  return query
    select
      au.id,
      au.email::text,
      au.created_at
    from auth.users au
    left join public.users pu on pu.auth_id = au.id
    where pu.id is null
      and au.created_at > now() - interval '7 days'
    order by au.created_at desc;
end;
$$;


-- -----------------------------------------------------------------------
-- 3. has_swiped_right() — both ids came from the caller, neither was checked
--
-- Let anyone probe whether user A had swiped right on user B, for any pair.
-- Profile ids are not secret; they appear in /profile/:userId URLs.
--
-- Note the direction. The only callsite, src/components/feed/SwipeDeck.jsx,
-- passes p_swiper_id: profile.id, p_target_id: currentUserId — it asks "has
-- *this other member* swiped right on *me*". So the target is what must come
-- from the session; the swiper stays a parameter. Deriving the swiper instead
-- would be the obvious-looking fix and would break the feature.
--
-- p_target_id is now ignored, kept only so the callsite needs no change (the
-- same approach 20260623124000 took). When auth.uid() has no profile the
-- comparison is against null, so anon gets a plain false.
-- -----------------------------------------------------------------------
create or replace function public.has_swiped_right(p_swiper_id uuid, p_target_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (
    select 1 from swipes s
    where s.swiper_id = p_swiper_id
      and s.target_id = (select id from users where auth_id = auth.uid())
      and s.direction = 'right'
  );
$$;


-- -----------------------------------------------------------------------
-- 4. toggle_message_reaction() — resolved the caller but never checked them
--
-- The caller was correctly derived from auth.uid(), but nothing verified they
-- were a participant in the match the message belongs to, so any authenticated
-- user holding a message id could react inside a conversation they are not
-- part of. Guessing a UUID is impractical, which makes this the least urgent
-- of the four — but the check costs nothing.
--
-- Also gains SET search_path, which it was missing.
-- -----------------------------------------------------------------------
create or replace function public.toggle_message_reaction(p_message_id uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from users where auth_id = auth.uid();

  if v_user_id is null then
    raise exception 'User not found';
  end if;

  -- caller must be a participant in the match this message belongs to
  if not exists (
    select 1
    from messages msg
    join matches m on m.id = msg.match_id
    where msg.id = p_message_id
      and (m.user_a_id = v_user_id or m.user_b_id = v_user_id)
  ) then
    raise exception 'Not a participant in this conversation';
  end if;

  delete from message_reactions
    where message_id = p_message_id
      and user_id = v_user_id
      and emoji = p_emoji;

  if not found then
    insert into message_reactions (message_id, user_id, emoji)
    values (p_message_id, v_user_id, p_emoji)
    on conflict (message_id, user_id, emoji) do nothing;
  end if;
end;
$$;


-- -----------------------------------------------------------------------
-- 5. Revoke the default PUBLIC/anon EXECUTE on the two admin functions
--
-- Postgres grants EXECUTE to PUBLIC on every new function, which is how these
-- became reachable without an account in the first place. The founder checks
-- above already make an anonymous call fail, so this is defence in depth on
-- production — but it is load-bearing for a rebuilt database, where these
-- functions are created fresh and would otherwise inherit the default again.
--
-- authenticated keeps its explicit grant, so the Admin page is unaffected.
-- Idempotent; matches the revokes applied by hand to production on 3 Aug 2026.
-- -----------------------------------------------------------------------
revoke execute on function public.get_member_emails()      from public, anon;
revoke execute on function public.get_incomplete_signups() from public, anon;
