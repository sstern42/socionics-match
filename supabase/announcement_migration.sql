-- Run in Supabase SQL editor
-- Adds editable announcement to the existing stats table

alter table stats
  add column if not exists announcement text,
  add column if not exists announcement_active boolean not null default false;

-- Allow founders to update the stats row (announcement fields)
-- Stats table already has public read via existing policy.
-- Add an authenticated update policy so Admin page can save.
create policy if not exists "Stats: authenticated can update"
  on stats for update
  using (auth.role() = 'authenticated');
