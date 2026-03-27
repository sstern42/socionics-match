-- Run in Supabase SQL editor
-- Adds last_active tracking to users table

alter table users
  add column if not exists last_active timestamptz;

-- Backfill with created_at for existing users
update users set last_active = created_at where last_active is null;

-- Allow users to update their own last_active
-- (the existing "Users: update own profile" policy already covers this
--  since it uses auth_id match — no new policy needed)
