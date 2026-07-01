-- ============================================================================
-- Migration: Enforce unique display names (going forward)
-- ============================================================================
-- Closes #819. Display name lives in users.profile_data->>'name' (JSONB) and
-- had no uniqueness check anywhere — client or DB. Two users could freely use
-- the same name, which QA flagged as confusing ("The use of already taken
-- names should be prohibited").
--
-- Production already has 7 existing duplicate names (~14 accounts) at the
-- time this was written, so a straight UNIQUE index isn't viable — it would
-- fail to create and, more importantly, renaming real users' display names
-- without asking them isn't something to do silently in a migration.
-- Grandfathered instead: existing duplicates are left exactly as they are,
-- and a BEFORE INSERT/UPDATE trigger blocks any *new* write (signup or
-- profile edit) that would create a fresh collision.
--
-- The app-side violation (Postgres error code 23505, raised explicitly below
-- with a 'display_name_taken' message) is caught in src/lib/profile.js and
-- surfaced as a friendly "already taken" message in ProfileSetup.jsx and
-- ProfileEdit.jsx, rather than a raw trigger error.
--
-- Safe to re-run: idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_unique_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_normalized     TEXT;
  v_old_normalized TEXT;
BEGIN
  v_normalized := lower(trim(coalesce(NEW.profile_data->>'name', '')));
  IF v_normalized = '' THEN
    RETURN NEW;
  END IF;

  -- Only re-check on UPDATE if the name is actually changing. Without this,
  -- any profile edit (bio, photos, anything touching profile_data) by a user
  -- already in a grandfathered duplicate pair would get blocked forever,
  -- since their unchanged name would still "collide" with their duplicate's.
  IF TG_OP = 'UPDATE' THEN
    v_old_normalized := lower(trim(coalesce(OLD.profile_data->>'name', '')));
    IF v_old_normalized = v_normalized THEN
      RETURN NEW;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM users
    WHERE id <> NEW.id
      AND lower(trim(profile_data->>'name')) = v_normalized
  ) THEN
    RAISE EXCEPTION 'display_name_taken: that display name is already in use' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_enforce_unique_display_name ON users;
CREATE TRIGGER users_enforce_unique_display_name
  BEFORE INSERT OR UPDATE OF profile_data ON users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_unique_display_name();


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- 1. Confirm the trigger exists:
--    SELECT tgname FROM pg_trigger WHERE tgname = 'users_enforce_unique_display_name';
--
-- 2. Existing duplicates remain untouched:
--    SELECT lower(trim(profile_data->>'name')) AS name, count(*)
--    FROM users
--    WHERE trim(coalesce(profile_data->>'name', '')) <> ''
--    GROUP BY 1 HAVING count(*) > 1;
--    -- should still show the same pre-existing duplicates, unchanged.
--
-- 3. Confirm new collisions are blocked — try updating one user's name to
--    match another existing (non-duplicate) user's name and confirm it's
--    rejected with a 23505 error.
--
-- 4. Confirm unrelated updates (e.g. touching last_active, type, avatar_url
--    without changing profile_data) are unaffected — the trigger only fires
--    on INSERT or on UPDATE statements that set profile_data.
--
-- 5. Confirm a user already in a grandfathered duplicate pair can still save
--    unrelated profile edits (bio, photos, etc.) as long as their name isn't
--    changing — the trigger skips the check entirely when the normalised
--    name is unchanged, so a pre-existing collision never blocks future
--    saves for either party.


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP TRIGGER IF EXISTS users_enforce_unique_display_name ON users;
-- DROP FUNCTION IF EXISTS enforce_unique_display_name();
