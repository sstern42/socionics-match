-- ============================================================================
-- Migration: baseline RLS policies (rls_reset.sql) — issue #972
-- ============================================================================
-- Content is rls_reset.sql verbatim, moved into the migration sequence so a
-- from-scratch rebuild reproduces it.
--
-- It runs *here*, immediately after 20260527120000, rather than inside
-- 20260501000000_initial_schema.sql, because the "Matches: create" policy
-- calls can_add_connection() — a function that 20260527120000 creates. Placing
-- it any earlier fails with "function can_add_connection(uuid) does not exist".
-- That dependency is also the tell that rls_reset.sql was edited after it was
-- first run: the file is maintained as a living "current policies" document,
-- not an append-only history.
--
-- Later migrations drop and re-create several of these policies (notably
-- 20260623121000_users_protect_sensitive_columns and
-- 20260623122000_protect_matches_blocks_columns). Those run after this file,
-- so they still win — this is the starting state they expect, not the end
-- state.
--
-- ⚠️  Already applied in production. Do not re-run it there; record it as
-- applied using the INSERT in 20260501000000_initial_schema.sql's header.
-- Safe to re-run regardless: every policy is dropped-if-exists first.
--
-- One deviation from rls_reset.sql: that file drops the *historical* policy
-- names but not the ones it creates, so running it twice failed with
-- 'policy "Users: read all profiles" for table "users" already exists'. Four
-- DROP POLICY IF EXISTS lines were added here so this migration is genuinely
-- re-runnable. No policy definition was changed.
-- ============================================================================


-- ============================================================
-- Socion: full RLS reset
-- Run this once in the Supabase SQL editor.
-- It drops all existing policies and recreates them cleanly.
-- Safe to re-run — all drops use IF EXISTS.
-- ============================================================


-- ── USERS ───────────────────────────────────────────────────

drop policy if exists "Users own their profile"           on users;
drop policy if exists "Anyone can read profiles"          on users;
drop policy if exists "Users can read profiles"           on users;
drop policy if exists "Users: anyone can read profiles"   on users;
drop policy if exists "Users can update own profile"      on users;
drop policy if exists "Users: update own profile"         on users;
drop policy if exists "Users can insert own profile"      on users;
drop policy if exists "Users: insert own profile"         on users;
drop policy if exists "Users can delete own profile"      on users;
drop policy if exists "Users: delete own profile"         on users;

-- All authenticated users can browse the feed
drop policy if exists "Users: read all profiles"           on users;
create policy "Users: read all profiles"
  on users for select
  using (auth.role() = 'authenticated');

-- Users can only write their own row
create policy "Users: insert own profile"
  on users for insert
  with check (auth.uid() = auth_id);

create policy "Users: update own profile"
  on users for update
  using (auth.uid() = auth_id);

create policy "Users: delete own profile"
  on users for delete
  using (auth.uid() = auth_id);


-- ── MATCHES ─────────────────────────────────────────────────

drop policy if exists "Users can read own matches"             on matches;
drop policy if exists "Users can create matches"               on matches;
drop policy if exists "Users can create a match"               on matches;
drop policy if exists "Users can update own match feedback"    on matches;
drop policy if exists "Matches: read own matches"              on matches;
drop policy if exists "Matches: create match"                  on matches;
drop policy if exists "Matches: update feedback"               on matches;

drop policy if exists "Matches: read own"                      on matches;
create policy "Matches: read own"
  on matches for select
  using (
    user_a_id in (select id from users where auth_id = auth.uid())
    or
    user_b_id in (select id from users where auth_id = auth.uid())
  );

drop policy if exists "Matches: create"                        on matches;
create policy "Matches: create"
  on matches for insert
  with check (
    user_a_id in (select id from users where auth_id = auth.uid())
    and can_add_connection(user_a_id)
    and can_add_connection(user_b_id)
  );

create policy "Matches: update feedback"
  on matches for update
  using (
    user_a_id in (select id from users where auth_id = auth.uid())
    or
    user_b_id in (select id from users where auth_id = auth.uid())
  );


-- ── MESSAGES ────────────────────────────────────────────────

drop policy if exists "Users can read messages in own matches"   on messages;
drop policy if exists "Users can send messages in own matches"   on messages;
drop policy if exists "Messages: read in own matches"            on messages;
drop policy if exists "Messages: send in own matches"            on messages;

create policy "Messages: read in own matches"
  on messages for select
  using (
    match_id in (
      select id from matches
      where
        user_a_id in (select id from users where auth_id = auth.uid())
        or
        user_b_id in (select id from users where auth_id = auth.uid())
    )
  );

create policy "Messages: send in own matches"
  on messages for insert
  with check (
    sender_id in (select id from users where auth_id = auth.uid())
    and
    match_id in (
      select id from matches
      where
        user_a_id in (select id from users where auth_id = auth.uid())
        or
        user_b_id in (select id from users where auth_id = auth.uid())
    )
  );


-- ── TYPE ASSESSMENTS ────────────────────────────────────────

drop policy if exists "Users own their assessments" on type_assessments;

drop policy if exists "Assessments: own only" on type_assessments;
create policy "Assessments: own only"
  on type_assessments for all
  using (
    user_id in (select id from users where auth_id = auth.uid())
  );


-- ── REALTIME ────────────────────────────────────────────────
-- Ensure the messages table is in the realtime publication.
-- This is idempotent — safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
