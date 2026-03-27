-- Run in Supabase SQL editor
-- Adds members_yesterday tracking to stats table for daily digest comparison

alter table stats
  add column if not exists members_yesterday integer;

-- Seed with current value so first email shows 0 delta rather than null
update stats set members_yesterday = users where members_yesterday is null;
