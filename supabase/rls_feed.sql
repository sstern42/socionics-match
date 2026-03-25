-- Run this in Supabase SQL editor to enable the matching feed
-- Allows users to read other profiles (required for the feed)

-- Drop the existing restrictive policy
drop policy if exists "Users own their profile" on users;

-- Users can read any profile (feed browsing)
create policy "Anyone can read profiles" on users
  for select using (auth.role() = 'authenticated');

-- Users can only update/delete their own profile
create policy "Users can update own profile" on users
  for update using (auth.uid() = auth_id);

create policy "Users can insert own profile" on users
  for insert with check (auth.uid() = auth_id);

-- Matches: users can read matches they are part of
create policy "Users can read own matches" on matches
  for select using (
    user_a_id in (select id from users where auth_id = auth.uid())
    or
    user_b_id in (select id from users where auth_id = auth.uid())
  );

-- Users can create a match (initiate connection)
create policy "Users can create matches" on matches
  for insert with check (
    user_a_id in (select id from users where auth_id = auth.uid())
  );

-- Users can update feedback on their own matches
create policy "Users can update own match feedback" on matches
  for update using (
    user_a_id in (select id from users where auth_id = auth.uid())
    or
    user_b_id in (select id from users where auth_id = auth.uid())
  );
