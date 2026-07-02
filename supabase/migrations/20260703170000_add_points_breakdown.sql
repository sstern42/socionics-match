-- ============================================================================
-- Migration: Points breakdown by action type
-- ============================================================================
-- Lets a user see how their points total was earned — grouped by
-- action_type rather than a raw per-row list, since repeatable actions
-- (messages, board posts, etc.) can rack up hundreds of rows over time.
-- point_transactions already has an RLS policy restricting SELECT to the
-- caller's own rows (20260703140000_add_points_system.sql), so this is a
-- convenience aggregate on top of data the client can already read —
-- computed in the DB rather than downloaded row-by-row and summed in JS.
--
-- Safe to re-run: idempotent (CREATE OR REPLACE only).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_points_breakdown(p_user_id UUID)
RETURNS TABLE (
  action_type TEXT,
  total_points INT,
  action_count INT,
  last_earned_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    action_type,
    SUM(points)::INT AS total_points,
    COUNT(*)::INT AS action_count,
    MAX(created_at) AS last_earned_at
  FROM point_transactions
  WHERE user_id = p_user_id
  GROUP BY action_type
  ORDER BY total_points DESC;
$$;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION (run these in the SQL Editor after the migration)
-- ============================================================================

-- 1. Confirm the function exists and totals reconcile with get_points_total():
--    SELECT * FROM get_points_breakdown('<some-user-uuid>');
--    SELECT SUM(total_points) FROM get_points_breakdown('<some-user-uuid>');
--    -- should equal:
--    SELECT get_points_total('<some-user-uuid>');


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP FUNCTION IF EXISTS get_points_breakdown(UUID);
