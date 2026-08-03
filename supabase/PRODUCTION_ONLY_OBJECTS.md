# Database objects that exist only in production

Some of Socion's schema was created by hand in the Supabase SQL editor and
never written down. Those objects exist in the live database and the app
depends on them, but nothing in this repo creates them — so a database rebuilt
from `supabase/migrations/` is **not** a faithful copy of production.

This file is the known gap. It was produced while fixing
[#972](https://github.com/sstern42/socionics-match/issues/972), which made the
migrations replay cleanly from empty; closing the rest needs definitions that
only production has.

## What is already fixed

`supabase/migrations/` now rebuilds the schema from nothing:

- `20260501000000_initial_schema.sql` carries the base tables that used to live
  only in the hand-run files (`schema.sql`, `blocks.sql`, `push_subscriptions.sql`,
  `stats.sql`, plus `users.avatar_url` from `avatars.sql`).
- `20260527130000_baseline_rls_policies.sql` and
  `20260527140000_baseline_swipe_mode.sql` carry `rls_reset.sql` and
  `swipes_schema.sql`, which have to run after `20260527120000` because both
  depend on `can_add_connection()`.
- Section 5 of the initial migration reconstructs six objects that migrations
  themselves referenced but nothing created: `matches.unmatched_at`,
  `users.last_active`, `users.verified_by`, `stats.announcement`,
  `stats.announcement_active`, and `get_my_user_id()`. Each is reconstructed
  from its usage, with the evidence recorded inline. **Production's copies are
  authoritative** — these were written to make a rebuild work, not to redefine
  what is live.

## What is still missing

Everything below is called by application code but created by no file in this
repo. A rebuilt database will not have it.

### Functions (RPCs the app calls)

| Function | Called from |
|---|---|
| `get_incomplete_signups` | admin |
| `get_member_emails` | admin |
| `get_network_data` | network graph |
| `get_public_stats` | public stats page |
| `get_saved_profile_ids` | saved profiles |
| `get_saved_profiles` | saved profiles |
| `has_swiped_right` | feed / swipe deck |
| `mark_messages_read` | messages |
| `toggle_message_reaction` | messages |
| `toggle_save_profile` | saved profiles |
| `unmatch` | connections |

### Tables

`ai_message_counts`, `feedback`, `founder_posts`, `founder_post_reactions`,
`notifications`, `message_reactions`, and whatever `get_saved_profiles` reads
(likely a `saved_profiles` table — no name appears in client code).

`ai_message_counts` is the clearest illustration: migration
`20260623126000_increment_ai_message_count.sql` inserts into and updates that
table, yet no file ever creates it.

### Why a green replay doesn't prove these exist

Postgres does not validate the body of a `plpgsql` function when it is created
— only when it runs. So a migration that defines a function against a
non-existent table still applies cleanly. **All 74 migrations replaying
successfully proves the DDL is ordered correctly; it does not prove the
functions work.** The gap above was found by cross-checking every
`.rpc('…')` and `.from('…')` in `src/` and `supabase/functions/` against a
rebuilt database, not by the replay.

## Closing the gap

The definitions have to come from production — reconstructing them from call
sites would be guesswork, and most are `SECURITY DEFINER` functions where a
subtly wrong body is a security bug rather than a typo. Run this in the SQL
editor against the live database and commit the output as a new migration:

```sql
-- Function definitions
SELECT string_agg(pg_get_functiondef(p.oid), E';\n\n' ORDER BY p.proname) || ';'
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_incomplete_signups','get_member_emails','get_network_data',
    'get_public_stats','get_saved_profile_ids','get_saved_profiles',
    'has_swiped_right','mark_messages_read','toggle_message_reaction',
    'toggle_save_profile','unmatch'
  );

-- Tables the migrations don't create, with their columns
SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'ai_message_counts','feedback','founder_posts','founder_post_reactions',
    'notifications','message_reactions','saved_profiles'
  )
ORDER BY table_name, ordinal_position;

-- Their RLS policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ai_message_counts','feedback','founder_posts','founder_post_reactions',
    'notifications','message_reactions','saved_profiles'
  )
ORDER BY tablename, policyname;
```

To find anything this list has missed, rebuild a database from
`supabase/migrations/` and re-run the cross-check: extract every
`.rpc('name')` and `.from('name')` from `src/` and `supabase/functions/` and
compare against `pg_proc` / `information_schema.tables` in the rebuilt
database.

## Also still manual

These are project configuration rather than schema, so they are deliberately
not in migrations — they need a Vault secret and a project-specific functions
URL:

- the `avatars` storage bucket and its `storage.objects` policies (`avatars.sql`)
- the three `cron.schedule()` jobs — `compute-stats`, `daily-ai-usage`,
  `daily-digest` (`stats.sql`), which read `service_role_key` from Vault
