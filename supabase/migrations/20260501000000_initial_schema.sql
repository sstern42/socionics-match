-- ============================================================================
-- Migration: initial schema (baseline for a from-scratch rebuild) — issue #972
-- ============================================================================
-- Everything in `supabase/migrations/` ALTERs tables that nothing in that
-- directory ever CREATEs: `users`, `matches`, `messages`, `type_assessments`,
-- `blocks`, `stats` and `push_subscriptions` were only ever created by the
-- hand-run files in `supabase/` (schema.sql, blocks.sql, …), which the README
-- documents as "run this in the SQL editor".
--
-- So a replay against an empty database died on the first statement of the
-- first migration:
--
--   ERROR: relation "users" does not exist (SQLSTATE 42P01)
--   -- 20260527120000_add_premium_subscription_support.sql
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN ...
--
-- which is why the Supabase Preview check failed on every PR touching
-- `supabase/`, whatever the PR contained. This file is that missing baseline:
-- the original table definitions, in the state the 20260527120000 migration
-- expects to find them.
--
-- Contents are taken verbatim from the hand-run files, minus anything that
-- depends on objects a later migration creates:
--
--   schema.sql             — users, type_assessments, matches, messages
--   blocks.sql             — blocks
--   push_subscriptions.sql — push_subscriptions
--   stats.sql              — stats (the table only; see below)
--   avatars.sql            — users.avatar_url (the column only; see below)
--
-- Deliberately NOT here, because they need can_add_connection() from
-- 20260527120000 and so cannot run this early — they follow immediately after
-- it instead:
--
--   rls_reset.sql       → 20260527130000_baseline_rls_policies.sql
--   swipes_schema.sql   → 20260527140000_baseline_swipe_mode.sql
--
-- Deliberately NOT here at all:
--
--   get_admin_stats.sql — superseded. Migrations own this function now; the
--                         earliest full definition is in 20260606_relation_stats
--                         and several later migrations replace it wholesale.
--   stats.sql's cron.schedule() calls, and avatars.sql's storage bucket and
--                         storage.objects policies — project configuration,
--                         not schema. They need a vault secret and a
--                         project-specific functions URL, so they stay manual
--                         one-time setup. See the README.
--
-- ⚠️  PRODUCTION ALREADY HAS EVERY OBJECT IN THIS FILE. Do not run it against
-- production — just record it as applied, together with the two migrations
-- that follow it (one statement, safe to re-run):
--
--   INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
--     ('20260501000000', 'initial_schema'),
--     ('20260527130000', 'baseline_rls_policies'),
--     ('20260527140000', 'baseline_swipe_mode')
--   ON CONFLICT (version) DO NOTHING;
--
-- Every statement below is idempotent regardless, so an accidental run is a
-- no-op rather than a loss.
-- ============================================================================


-- ============================================================================
-- SECTION 1: core tables (schema.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id) on delete cascade,
  type text not null,
  type_confidence jsonb,         -- { ILE: 0.7, LII: 0.2, ... }
  purpose text[] default array['dating'],
  relation_preferences text[],   -- e.g. ['DUAL','ACTIVITY','MIRROR']
  location text,
  profile_data jsonb,            -- name, bio, age, etc.
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS type_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  responses jsonb not null,
  computed_type_distribution jsonb not null,
  version text not null default 'slide-1.0',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid references users(id) on delete cascade,
  user_b_id uuid references users(id) on delete cascade,
  relation_type text not null,
  purpose text not null default 'dating',
  created_at timestamptz default now(),
  feedback_a jsonb,
  feedback_b jsonb
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  sender_id uuid references users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- users.avatar_url (avatars.sql section 1 — the schema half of that file)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE type_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;

-- The original two policies. 20260527130000_baseline_rls_policies.sql drops
-- both and installs the current set — they are recreated here only so the
-- rebuild passes through the same states the live database did.
DROP POLICY IF EXISTS "Users own their profile" ON users;
CREATE POLICY "Users own their profile" ON users
  FOR ALL USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS "Users own their assessments" ON type_assessments;
CREATE POLICY "Users own their assessments" ON type_assessments
  FOR ALL USING (
    user_id in (select id from users where auth_id = auth.uid())
  );


-- ============================================================================
-- SECTION 2: blocks (blocks.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocks (
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

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks(blocked_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own blocks" ON blocks;
CREATE POLICY "Users can manage their own blocks"
  ON blocks FOR ALL
  USING (blocker_id in (select id from users where auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can see blocks against them" ON blocks;
CREATE POLICY "Users can see blocks against them"
  ON blocks FOR SELECT
  USING (blocked_id in (select id from users where auth_id = auth.uid()));


-- ============================================================================
-- SECTION 3: push_subscriptions (push_subscriptions.sql)
-- ============================================================================
-- Note this one keys on auth.users(id), not public.users(id).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  subscription jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- SECTION 4: stats (stats.sql — table only)
-- ============================================================================
-- The three cron.schedule() calls in stats.sql are not here: they post to a
-- project-specific functions URL with a service_role key read from Vault, so
-- they are per-project setup rather than schema. See the README.

CREATE TABLE IF NOT EXISTS stats (
  id integer primary key default 1,
  users integer not null default 0,
  countries integer not null default 0,
  connections integer not null default 0,
  types integer not null default 0,
  members_yesterday integer not null default 0,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

ALTER TABLE stats ADD COLUMN IF NOT EXISTS members_yesterday integer not null default 0;

ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stats are publicly readable" ON stats;
CREATE POLICY "Stats are publicly readable"
  ON stats FOR SELECT
  USING (true);


-- ============================================================================
-- SECTION 5: objects that exist ONLY in production — RECONSTRUCTED
-- ============================================================================
-- ⚠️  Everything in this section was created ad hoc in the SQL editor and
-- never captured in any file. Migrations and application code both depend on
-- these objects, so a from-scratch rebuild fails without them — but nothing in
-- the repo says what they are. Each is reconstructed from its usage, and the
-- evidence is given inline so the guesswork is auditable.
--
-- Production's copies are authoritative and untouched (this file never runs
-- there). To reconcile if it ever matters, compare against:
--
--   SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--   WHERE table_name IN ('users','matches','stats') ORDER BY table_name, column_name;
--
-- ── matches.unmatched_at ────────────────────────────────────────────────────
-- Soft-delete marker for a connection: NULL = active. Used as a bare
-- `unmatched_at IS NULL` filter in 20260606000001_relation_stats.sql,
-- 20260614000001_fix_connection_cap_count.sql and others, and written by
-- src/lib/unmatch.js. Timestamp rather than boolean: src/lib/feed.js filters
-- with `.is('unmatched_at', null)` and revive_match() clears it back to NULL.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS unmatched_at timestamptz;

-- ── users.last_active ───────────────────────────────────────────────────────
-- Last time the member was seen. Compared against `now() - interval '7 days'`
-- in get_admin_stats (20260620130000, 20260623120000) and ordered on in
-- src/lib/feed.js; written by AuthContext on every profile load. Nullable —
-- feed.js orders with `nullsFirst: false`, so NULL is an expected state.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active timestamptz;

-- ── users.verified_by ───────────────────────────────────────────────────────
-- Who verified this member's type, NULL if unverified. Text rather than a uuid
-- FK: src/components/feed/ProfileCard.jsx renders it directly as
-- `Verified by ${verified_by}`. Drives type_source in
-- 20260702160000_onboarding_typing_chat.sql ('paid_verified' when set).
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by text;

-- ── stats.announcement / stats.announcement_active ──────────────────────────
-- The original sitewide banner, written by
-- 20260618150000_announce_boards.sql (`UPDATE stats SET announcement = '…',
-- announcement_active = true`). Types mirror the site_banner/site_banner_active
-- pair that 20260619150000_add_site_banner_columns.sql later added to the same
-- table as this pair's successor.
ALTER TABLE stats ADD COLUMN IF NOT EXISTS announcement text DEFAULT '';
ALTER TABLE stats ADD COLUMN IF NOT EXISTS announcement_active boolean NOT NULL DEFAULT false;

-- ── get_my_user_id() ────────────────────────────────────────────────────────
-- Called by two RLS policies in 20260602000001_reactions.sql:
--
--   CREATE POLICY "reactions_insert" ... WITH CHECK (user_id = get_my_user_id());
--   CREATE POLICY "reactions_delete" ... USING      (user_id = get_my_user_id());
--
-- and `grep -rn get_my_user_id` over the whole repo returns only those two
-- lines — it was created ad hoc in the SQL editor and never captured. A
-- from-scratch rebuild therefore failed here with "function get_my_user_id()
-- does not exist", even after the missing base schema was restored.
--
-- The definition below is reconstructed from that usage, not copied from
-- production: both call sites compare it to `room_message_reactions.user_id`,
-- a FK to public.users(id), so it returns the caller's own users.id. That is
-- the same lookup the rest of the codebase writes inline as
-- `(select id from users where auth_id = auth.uid())` — see the policies in
-- 20260527130000_baseline_rls_policies.sql.
--
-- Production's copy is authoritative and is left untouched (this file is
-- never run there). If the two ever need to be reconciled, dump the live
-- definition and replace this one:
--
--   SELECT pg_get_functiondef('public.get_my_user_id'::regproc);

CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_id = auth.uid();
$$;
