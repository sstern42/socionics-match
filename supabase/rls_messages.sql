-- Run in Supabase SQL editor — enables messaging RLS

-- Messages: users can read messages in matches they belong to
create policy "Users can read messages in own matches" on messages
  for select using (
    match_id in (
      select id from matches
      where user_a_id in (select id from users where auth_id = auth.uid())
         or user_b_id in (select id from users where auth_id = auth.uid())
    )
  );

-- Users can send messages in matches they belong to
create policy "Users can send messages in own matches" on messages
  for insert with check (
    sender_id in (select id from users where auth_id = auth.uid())
    and
    match_id in (
      select id from matches
      where user_a_id in (select id from users where auth_id = auth.uid())
         or user_b_id in (select id from users where auth_id = auth.uid())
    )
  );
