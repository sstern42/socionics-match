-- ============================================================
-- Socion: blocks table
-- Run in Supabase SQL editor
-- ============================================================

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references users(id) on delete cascade not null,
  blocked_id uuid references users(id) on delete cascade not null,
  type text not null check (type in ('cooloff', 'block')),
  reason text check (reason in ('spam', 'inappropriate', 'other')),
  notes text,
  expires_at timestamptz, -- null = permanent
  lifted_at timestamptz,  -- set when manually lifted early
  created_at timestamptz default now(),
  constraint no_self_block check (blocker_id != blocked_id)
);

-- Index for fast feed filtering
create index if not exists blocks_blocker_idx on blocks(blocker_id);
create index if not exists blocks_blocked_idx on blocks(blocked_id);

alter table blocks enable row level security;

-- Users can read and create their own blocks
create policy "Users can manage their own blocks"
  on blocks for all
  using (blocker_id in (select id from users where auth_id = auth.uid()));

-- Users can also see blocks where they are the blocked party (to know messaging is paused)
create policy "Users can see blocks against them"
  on blocks for select
  using (blocked_id in (select id from users where auth_id = auth.uid()));
