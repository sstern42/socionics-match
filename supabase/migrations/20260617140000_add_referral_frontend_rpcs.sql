-- ============================================================================
-- Migration: Add Referral Frontend Support RPCs
-- ============================================================================
-- Spec reference: socion-referral-architecture-spec.md v1.4
-- Phase: Days 5-7 — Frontend and polish
--
-- Adds two read-only, callable-by-anyone (including anon, pre-signup) RPCs:
--   • get_referrer_display_name(code) — powers the referee onboarding banner
--     ("You were invited by X"), called from /r/:code before an account
--     exists, so it can't depend on auth.uid().
--   • get_referral_leaderboard() — powers the public Top Connectors list
--     (3+ tier). Anonymous-mode users are excluded from the public list,
--     matching the existing anonymous-mode privacy guarantee elsewhere
--     in the app (name/age/photo/location hidden).
--
-- Safe to re-run: idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_referrer_display_name(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile_data->>'name' FROM users WHERE referral_code = p_code;
$$;

CREATE OR REPLACE FUNCTION get_referral_leaderboard()
RETURNS TABLE (
  display_name TEXT,
  referral_count_qualified INT,
  tier TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    profile_data->>'name' AS display_name,
    referral_count_qualified,
    referral_tier(id) AS tier
  FROM users
  WHERE referral_count_qualified >= 3
    AND COALESCE((profile_data->>'anonymous')::boolean, false) = false
  ORDER BY referral_count_qualified DESC
  LIMIT 10;
$$;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP FUNCTION IF EXISTS get_referrer_display_name(TEXT);
-- DROP FUNCTION IF EXISTS get_referral_leaderboard();
