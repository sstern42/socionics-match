-- ============================================================================
-- Migration: Points tiers + leaderboard (phase 2 of #861)
-- ============================================================================
-- v1 (20260703140000_add_points_system.sql) shipped just the ledger and a
-- running total. This adds the two pieces of #861's deferred list that
-- reuse existing patterns near-verbatim:
--   • points_tier()          — mirrors referral_tier()
--   • get_points_leaderboard() — mirrors get_referral_leaderboard()
--
-- Still NOT added here (deferred further): badges/achievements UI (needs
-- new schema + icon design, a bigger effort than tiers/leaderboard) and any
-- spending mechanics.
--
-- Tier thresholds are tunable constants, same spirit as award_points()'s
-- point values — adjust points_tier_for_total() in a follow-up migration if
-- they need retuning; nothing else depends on the specific numbers.
--
-- Safe to re-run: every operation is idempotent.
-- ============================================================================


-- ============================================================================
-- SECTION 1: points_tier_for_total() / points_tier()
-- ============================================================================
-- Split into two functions so the leaderboard query (which already has the
-- summed total in hand via GROUP BY) can derive the tier without a second
-- per-row get_points_total() lookup.

CREATE OR REPLACE FUNCTION points_tier_for_total(p_points INT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 5000 THEN 'legend'
    WHEN p_points >= 1500 THEN 'core'
    WHEN p_points >= 500  THEN 'active'
    WHEN p_points >= 100  THEN 'regular'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION points_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT points_tier_for_total(get_points_total(p_user_id));
$$;


-- ============================================================================
-- SECTION 2: get_points_leaderboard()
-- ============================================================================
-- Minimum bar is the 'active' tier (500+) rather than the lowest 'regular'
-- tier — same shape as get_referral_leaderboard() requiring 3+ qualified
-- referrals (its second tier, "networker"), which skips the entry-level
-- tier so the list doesn't fill up with everyone who cleared the lowest bar.

CREATE OR REPLACE FUNCTION get_points_leaderboard()
RETURNS TABLE (
  display_name TEXT,
  points_total INT,
  tier TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.profile_data->>'name' AS display_name,
    SUM(pt.points)::INT AS points_total,
    points_tier_for_total(SUM(pt.points)::INT) AS tier
  FROM point_transactions pt
  JOIN users u ON u.id = pt.user_id
  WHERE COALESCE((u.profile_data->>'anonymous')::boolean, false) = false
  GROUP BY u.id, u.profile_data
  HAVING SUM(pt.points) >= 500
  ORDER BY points_total DESC
  LIMIT 10;
$$;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION (run these in the SQL Editor after the migration)
-- ============================================================================

-- 1. Confirm functions are callable:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_name IN ('points_tier_for_total', 'points_tier', 'get_points_leaderboard');

-- 2. Spot-check tier thresholds:
--    SELECT points_tier_for_total(0), points_tier_for_total(100),
--           points_tier_for_total(500), points_tier_for_total(1500), points_tier_for_total(5000);
--    -- expect: NULL, 'regular', 'active', 'core', 'legend'

-- 3. Confirm the leaderboard excludes anonymous users and sub-500 totals:
--    SELECT * FROM get_points_leaderboard();


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP FUNCTION IF EXISTS get_points_leaderboard();
-- DROP FUNCTION IF EXISTS points_tier(UUID);
-- DROP FUNCTION IF EXISTS points_tier_for_total(INT);
