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
  members_yesterday integer not null default 0,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

alter table stats
  add column if not exists members_yesterday integer not null default 0;

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

-- Schedule: post daily AI usage total to Discord at end of day (23:55 UTC)
select cron.schedule(
  'daily-ai-usage',
  '55 23 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/daily-ai-usage',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Schedule: send daily member stats digest email (09:00 UTC)
select cron.schedule(
  'daily-digest',
  '0 9 * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/daily-digest',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
