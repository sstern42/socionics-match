-- ============================================================================
-- Migration: Backfill points for existing users (one-time actions only)
-- ============================================================================
-- Follow-up to 20260703140000_add_points_system.sql. Existing users
-- shouldn't start at 0 just because the points system launched after they
-- signed up, matched, and got referrals qualified.
--
-- Scope is deliberately limited to one-time actions, which are safe to
-- backfill exactly:
--   • profile_complete   — every existing user who already has a non-empty
--                          bio AND a photo (avatar_url set — the same
--                          definition of "has a photo" as the Feed's
--                          existing "With photos" filter, and the same
--                          check src/lib/profile.js now applies going
--                          forward). NOT just "has a users row" — plenty of
--                          existing accounts finished signup (name/DOB/type
--                          only) without ever adding a bio or photo.
--   • mutual_match       — every historical match, both sides, regardless
--                          of current unmatched_at (the match happened
--                          whether or not it's since ended)
--   • referral_qualified — every referral already 'qualified' or 'rewarded'
--
-- Deliberately NOT backfilled:
--   • daily_login — there's no historical per-day login record to backfill
--     from, only a single last_active timestamp; awarding one credit per
--     day of account age would be a fabrication, not a backfill.
--   • message_sent / board_post / board_reaction / room_post — these are
--     daily-capped going forward. Reconstructing capped historical totals
--     from raw row counts is a materially different (and much larger)
--     change than "give existing users the points they'd already earned",
--     and risks a large, uneven one-off windfall for long-tenured active
--     users vs. new signups. Left for a separate decision if wanted.
--
-- Idempotent: award_points() no-ops via ON CONFLICT DO NOTHING on
-- (user_id, action_type, ref_id), so re-running this is harmless — no rows
-- appear twice, and it's also safe to run alongside real-time awards from
-- the app (a user completing their profile or getting a fresh match right
-- as this runs will just get one credit either way).
-- ============================================================================


-- ============================================================================
-- SECTION 1: profile_complete for users who already have a bio and a photo
-- ============================================================================

SELECT award_points(id, 'profile_complete', id::TEXT)
FROM users
WHERE avatar_url IS NOT NULL
  AND COALESCE(TRIM(profile_data->>'bio'), '') <> '';


-- ============================================================================
-- SECTION 2: mutual_match for every historical match, both sides
-- ============================================================================

SELECT award_points(user_a_id, 'mutual_match', id::TEXT)
FROM matches;

SELECT award_points(user_b_id, 'mutual_match', id::TEXT)
FROM matches;


-- ============================================================================
-- SECTION 3: referral_qualified for every already-qualified referral
-- ============================================================================

SELECT award_points(referrer_id, 'referral_qualified', id::TEXT)
FROM referrals
WHERE status IN ('qualified', 'rewarded');


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION (run these in the SQL Editor after the migration)
-- ============================================================================

-- 1. Spot-check a long-tenured, active user's new total:
--    SELECT get_points_total(id) FROM users ORDER BY created_at ASC LIMIT 1;

-- 2. Confirm counts line up with source tables:
--    SELECT COUNT(*) FROM point_transactions WHERE action_type = 'profile_complete';
--    -- should equal:
--    SELECT COUNT(*) FROM users WHERE avatar_url IS NOT NULL AND COALESCE(TRIM(profile_data->>'bio'), '') <> '';
--    SELECT COUNT(*) FROM point_transactions WHERE action_type = 'mutual_match';
--    -- should equal 2 * SELECT COUNT(*) FROM matches;
--    SELECT COUNT(*) FROM point_transactions WHERE action_type = 'referral_qualified';
--    -- should equal SELECT COUNT(*) FROM referrals WHERE status IN ('qualified','rewarded');

-- 3. Confirm re-running doesn't double-award (counts from step 2 unchanged
--    after running this file a second time).


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- Only safe to run immediately after this migration, before any organic
-- profile_complete/mutual_match/referral_qualified awards have occurred —
-- otherwise this also deletes real, non-backfilled awards of the same
-- action types.
--
-- DELETE FROM point_transactions
-- WHERE action_type IN ('profile_complete', 'mutual_match', 'referral_qualified');
