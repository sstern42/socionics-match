-- notifications-setup.sql
-- Run in Supabase SQL editor
-- Sets up:
--   1. reengagement_sent_at column on push_subscriptions
--   2. Database webhook for notify-new-dual on users INSERT
--   3. pg_cron job for daily re-engagement

-- ─────────────────────────────────────────────
-- 1. Add reengagement_sent_at to push_subscriptions
-- ─────────────────────────────────────────────
alter table push_subscriptions
  add column if not exists reengagement_sent_at timestamptz;


-- ─────────────────────────────────────────────
-- 2. Database webhook — notify-new-dual
-- Fires on every new row in users table
-- Set up via Supabase Dashboard > Database > Webhooks:
--   Table: users
--   Event: INSERT
--   URL: https://<project-ref>.supabase.co/functions/v1/notify-new-dual
--   HTTP method: POST
--   Headers: Authorization: Bearer <service_role_key>
--
-- Or create it programmatically via the Supabase management API.
-- The webhook fires the full new record as body.record.
-- ─────────────────────────────────────────────


-- ─────────────────────────────────────────────
-- 3. pg_cron — daily re-engagement at 10:00 UTC
-- ─────────────────────────────────────────────

-- Enable pg_cron if not already (requires Supabase Pro or pg_cron extension enabled)
-- In Supabase Dashboard > Database > Extensions > search pg_cron > Enable

select cron.schedule(
  'daily-reengagement',           -- job name (unique)
  '0 10 * * *',                   -- every day at 10:00 UTC
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/notify-reengagement',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- To check existing cron jobs:
-- select * from cron.job;

-- To remove the job if needed:
-- select cron.unschedule('daily-reengagement');
