-- ============================================================
-- Socion: stats table + scheduled job
-- Run in Supabase SQL editor
-- ============================================================

-- Stats table — single row, updated by edge function
create table if not exists stats (
  id integer primary key default 1,
  users integer not null default 0,
  countries integer not null default 0,
  connections integer not null default 0,
  types integer not null default 0,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Public read access (no auth needed for home page)
alter table stats enable row level security;

create policy "Stats are publicly readable"
  on stats for select
  using (true);

-- Schedule: run compute-stats every 6 hours via pg_cron
-- Note: pg_cron must be enabled in Supabase (Database → Extensions → pg_cron)
select cron.schedule(
  'compute-stats',
  '0 */6 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/compute-stats',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
