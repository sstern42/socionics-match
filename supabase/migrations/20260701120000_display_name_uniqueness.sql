-- ============================================================================
-- Migration: Enforce unique display names
-- ============================================================================
-- Closes #819. Display name lives in users.profile_data->>'name' (JSONB) and
-- had no uniqueness check anywhere — client or DB. Two users could freely use
-- the same name, which QA flagged as confusing ("The use of already taken
-- names should be prohibited").
--
-- A plain UNIQUE constraint isn't possible on a JSONB path directly, so this
-- adds a partial unique index on the case-/whitespace-normalised name. Rows
-- with no name yet (fresh signups before ProfileSetup completes, though in
-- practice name is always set at signup) are excluded via the WHERE clause
-- so NULLs/blank names never collide.
--
-- The app-side violation (Postgres error code 23505) is caught in
-- src/lib/profile.js and surfaced as a friendly "already taken" message in
-- ProfileSetup.jsx and ProfileEdit.jsx, rather than a raw constraint error.
--
-- Safe to re-run: idempotent.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name_unique
  ON users (lower(trim(profile_data->>'name')))
  WHERE trim(coalesce(profile_data->>'name', '')) <> '';


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- 1. Confirm the index exists:
--    SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_display_name_unique';
--
-- 2. Check for existing collisions before relying on this (the index creation
--    itself will fail if duplicates already exist — resolve those first):
--    SELECT lower(trim(profile_data->>'name')) AS name, count(*)
--    FROM users
--    WHERE trim(coalesce(profile_data->>'name', '')) <> ''
--    GROUP BY 1 HAVING count(*) > 1;


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_users_display_name_unique;
