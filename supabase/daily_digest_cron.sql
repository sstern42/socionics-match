-- Run in Supabase SQL editor
-- Schedules daily digest email at 7am UK time (BST = UTC+1, so 6am UTC)
-- Note: adjust to '0 7 * * *' in winter when UK is on GMT (UTC+0)

select cron.schedule(
  'daily-digest',
  '0 6 * * *',
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
