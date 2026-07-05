-- =============================================================
-- Socion — Room Host seeder (AI conversation starter for quiet rooms)
-- Migration: 20260705120000_room_host_seeder.sql
--
-- Creates a single dedicated "Socion Host" bot user that the
-- `seed-room-prompt` edge function posts conversation-starters as,
-- into quadra/socion rooms that have gone quiet.
--
-- Design notes:
--   * auth_id is NULL — the bot can never sign in.
--   * type = 'HOST' is intentionally not one of the 16 Socionics
--     types, so:
--       - the assign_quadra_room BEFORE-INSERT trigger leaves
--         room_id NULL (the bot is never counted as a room member),
--       - get_feed_profiles / get_feed_type_counts never surface it
--         (they filter `type = any(p_types)`, and 'HOST' is never a
--         valid relation target), and
--       - matching logic keyed on the relation matrix ignores it.
--   * profile_data.is_bot = true is the marker the edge function and
--     the frontend use to find / specially render the host.
--   * profile_data.hidden = true is belt-and-suspenders against the
--     feed's hidden filter.
--   * purpose = '{}' so it matches no purpose filter.
--
-- Safe to re-run (guarded INSERT).
-- =============================================================

INSERT INTO users (auth_id, type, purpose, profile_data)
SELECT
  NULL,
  'HOST',
  '{}'::text[],
  jsonb_build_object(
    'name',      'Socion Host',
    'is_bot',    true,
    'hidden',    true,
    'anonymous', false
  )
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE profile_data->>'is_bot' = 'true'
);


-- =============================================================
-- Scheduling (run manually in the Supabase SQL editor, same pattern
-- as stats.sql — pg_cron + a vault-stored service-role secret).
--
-- The edge function self-gates: on each run it only posts to a room
-- that has been quiet for a while AND whose last message wasn't the
-- host itself (so the host never talks to an empty void twice in a
-- row). That means the cron can safely run several times a day; each
-- run is cheap and usually a no-op.
--
-- Requires (one-time, already set up for stats.sql / daily-digest):
--   - pg_cron enabled (Database → Extensions)
--   - vault secret 'service_role_key' holding PROJECT_SECRET_KEY
--
--   select cron.schedule(
--     'seed-room-prompt',
--     '17 */6 * * *',   -- every 6 hours, offset off the hour
--     $$
--       select net.http_post(
--         url     := 'https://<project-ref>.supabase.co/functions/v1/seed-room-prompt',
--         headers := jsonb_build_object(
--           'Content-Type',  'application/json',
--           'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--         ),
--         body    := '{}'::jsonb
--       );
--     $$
--   );
-- =============================================================
