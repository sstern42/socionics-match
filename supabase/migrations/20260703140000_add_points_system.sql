-- ============================================================================
-- Migration: Points system (engagement gamification, v1/MVP)
-- ============================================================================
-- Issue #861 — v1 scope only: a points ledger + running total, surfaced on
-- the user's own profile. No badges, levels, leaderboard, or spending
-- mechanics yet (see issue for the deferred list).
--
-- Mirrors the referral programme's shape (see
-- 20260617120000_add_referral_programme_support.sql):
--   • point_transactions       — append-only log, source of truth
--   • award_points()           — SECURITY DEFINER, mirrors grant_referral_reward()
--   • get_points_total()       — SUM() helper for the frontend
--   • grant_referral_reward()  — extended to also award points to the referrer
--
-- Point values and daily caps below are intentionally simple, tunable
-- constants (the issue leaves exact values TBD) — see the CASE branches in
-- award_points(). Adjust in a follow-up migration if they need retuning;
-- nothing in the schema hardcodes them.
--
-- Safe to re-run: every operation is idempotent.
-- ============================================================================


-- ============================================================================
-- SECTION 1: point_transactions table
-- ============================================================================
-- ref_id is a free-form text key used two ways, matching the action:
--   • one-time actions (profile_complete, mutual_match, referral_qualified,
--     daily_login) pass a natural dedupe key (the source row's id, or the
--     date for daily_login) — the UNIQUE constraint below makes re-awarding
--     a no-op via ON CONFLICT DO NOTHING in award_points().
--   • repeatable actions (message_sent, board_post, board_reaction,
--     room_post) pass the source row's id purely as an audit trail; they're
--     rate-limited by the daily-cap count check in award_points() instead.

CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'profile_complete', 'daily_login', 'mutual_match', 'message_sent',
    'board_post', 'board_reaction', 'room_post', 'referral_qualified'
  )),
  points INT NOT NULL,
  ref_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, action_type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_daily_cap
  ON point_transactions(user_id, action_type, created_at);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Users may read their own transaction history (doubles as a future
-- activity feed). All writes go through award_points() (SECURITY DEFINER)
-- or the service role — no client INSERT/UPDATE/DELETE policy is added.
DROP POLICY IF EXISTS point_transactions_select_own ON point_transactions;
CREATE POLICY point_transactions_select_own ON point_transactions
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));


-- ============================================================================
-- SECTION 2: award_points()
-- ============================================================================
-- Called from app code right after the primary action succeeds (message
-- sent, board post created, match made, etc.), the same fire-and-forget
-- pattern as attributeAndRewardReferral() — a rewards hiccup should never
-- block the primary action. Unknown action types and daily-cap overflows
-- are silent no-ops rather than errors, so callers can't break on them.
--
-- Row-locks the target user first (see can_add_connection_row_lock.sql)
-- so two near-simultaneous calls for the same user can't both read the
-- same stale daily count and both pass the cap.

CREATE OR REPLACE FUNCTION award_points(p_user_id UUID, p_action_type TEXT, p_ref_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INT;
  v_daily_cap INT;
  v_today_count INT;
BEGIN
  PERFORM 1 FROM users WHERE id = p_user_id FOR UPDATE;

  v_points := CASE p_action_type
    WHEN 'profile_complete'    THEN 50
    WHEN 'daily_login'         THEN 5
    WHEN 'mutual_match'        THEN 20
    WHEN 'message_sent'        THEN 2
    WHEN 'board_post'          THEN 5
    WHEN 'board_reaction'      THEN 1
    WHEN 'room_post'           THEN 5
    WHEN 'referral_qualified'  THEN 30
    ELSE NULL
  END;

  IF v_points IS NULL THEN
    RETURN; -- unknown action_type
  END IF;

  v_daily_cap := CASE p_action_type
    WHEN 'message_sent'    THEN 10
    WHEN 'board_post'      THEN 5
    WHEN 'board_reaction'  THEN 10
    WHEN 'room_post'       THEN 5
    ELSE NULL -- one-time actions: no cap, idempotency comes from ref_id UNIQUE below
  END;

  IF v_daily_cap IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_count
      FROM point_transactions
      WHERE user_id = p_user_id
        AND action_type = p_action_type
        AND created_at >= date_trunc('day', NOW());

    IF v_today_count >= v_daily_cap THEN
      RETURN; -- daily cap reached for this action type
    END IF;
  END IF;

  INSERT INTO point_transactions (user_id, action_type, points, ref_id)
    VALUES (p_user_id, p_action_type, v_points, p_ref_id)
  ON CONFLICT (user_id, action_type, ref_id) DO NOTHING;
END;
$$;


-- ============================================================================
-- SECTION 3: get_points_total()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_points_total(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::INT
  FROM point_transactions
  WHERE user_id = p_user_id;
$$;


-- ============================================================================
-- SECTION 4: grant_referral_reward() — also award the referrer points
-- ============================================================================
-- Unchanged apart from one addition at the end: the referrer earns
-- 'referral_qualified' points alongside the existing premium-day reward,
-- keyed on the referral row's id so re-running this function for the same
-- referral (it can't — status flips to 'qualified' below — but belt and
-- braces) never double-awards. The referee doesn't get a second points
-- award here; they already earn 'profile_complete' points from the same
-- onboarding action that triggers this whole function.

CREATE OR REPLACE FUNCTION grant_referral_reward(p_referee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_referrer_premium BOOLEAN;
  v_referrer_days_granted INT;
  v_reward_days CONSTANT INT := 30;
  v_cap CONSTANT INT := 180;
  v_grantable_days INT;
BEGIN
  SELECT * INTO v_referral FROM referrals
    WHERE referee_id = p_referee_id AND status = 'pending';

  IF v_referral IS NULL THEN
    RETURN; -- no pending referral for this user
  END IF;

  -- Referee reward: 7-day trial, regardless of referrer's status
  UPDATE users
    SET referral_premium_until = GREATEST(
          COALESCE(referral_premium_until, NOW()), NOW()
        ) + INTERVAL '7 days'
    WHERE id = p_referee_id;

  -- Referrer reward: only meaningful if referrer isn't already premium via a
  -- real plan (founding member or paid subscription) — extra days would be
  -- worthless to them. Deliberately NOT is_premium(), which also returns
  -- true while a referral-earned window from a *previous* reward is still
  -- active; using it here would wrongly skip granting further days to a
  -- free-tier user who's mid-window but still under the 180-day cap.
  SELECT (is_founding_member OR plan_status IN ('active', 'past_due')),
         referral_premium_days_granted
    INTO v_referrer_premium, v_referrer_days_granted
    FROM users WHERE id = v_referral.referrer_id;

  v_grantable_days := LEAST(v_reward_days, v_cap - v_referrer_days_granted);

  IF NOT v_referrer_premium AND v_grantable_days > 0 THEN
    UPDATE users
      SET referral_premium_until = GREATEST(
            COALESCE(referral_premium_until, NOW()), NOW()
          ) + (v_grantable_days || ' days')::INTERVAL,
          referral_premium_days_granted = referral_premium_days_granted + v_grantable_days
      WHERE id = v_referral.referrer_id;
  END IF;

  -- Badge/recognition count always increments, premium or not
  UPDATE users
    SET referral_count_qualified = referral_count_qualified + 1
    WHERE id = v_referral.referrer_id;

  UPDATE referrals
    SET status = 'qualified', qualified_at = NOW(), reward_days_granted = v_grantable_days
    WHERE id = v_referral.id;

  PERFORM award_points(v_referral.referrer_id, 'referral_qualified', v_referral.id::TEXT);
END;
$$;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION (run these in the SQL Editor after the migration)
-- ============================================================================

-- 1. Confirm the table and functions exist:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_name IN ('award_points', 'get_points_total', 'grant_referral_reward');

-- 2. Award and read back:
--    SELECT award_points('<some-user-uuid>', 'daily_login', '2026-07-03');
--    SELECT get_points_total('<some-user-uuid>');

-- 3. Confirm idempotency (should not double-award):
--    SELECT award_points('<some-user-uuid>', 'daily_login', '2026-07-03');
--    SELECT get_points_total('<some-user-uuid>'); -- unchanged from step 2

-- 4. Confirm the daily cap on a repeatable action (11th call should no-op):
--    SELECT award_points('<some-user-uuid>', 'message_sent', gen_random_uuid()::text)
--    FROM generate_series(1, 11);
--    SELECT COUNT(*) FROM point_transactions
--    WHERE user_id = '<some-user-uuid>' AND action_type = 'message_sent'; -- should be 10


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP POLICY IF EXISTS point_transactions_select_own ON point_transactions;
-- DROP TABLE IF EXISTS point_transactions;
-- DROP FUNCTION IF EXISTS award_points(UUID, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS get_points_total(UUID);
--
-- Then restore grant_referral_reward() to its pre-points definition from
-- 20260617120000_add_referral_programme_support.sql Section 5.
