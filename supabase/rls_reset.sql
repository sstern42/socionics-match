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

create policy "Matches: read own"
  on matches for select
  using (
    user_a_id in (select id from users where auth_id = auth.uid())
    or
    user_b_id in (select id from users where auth_id = auth.uid())
  );

create policy "Matches: create"
  on matches for insert
  with check (
    user_a_id in (select id from users where auth_id = auth.uid())
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
