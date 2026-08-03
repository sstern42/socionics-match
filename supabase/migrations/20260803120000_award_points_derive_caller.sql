-- ============================================================================
-- Security fix: award_points() trusted a client-supplied user id (issue #970)
-- ============================================================================
-- award_points(p_user_id, p_action_type, p_ref_id) from
-- 20260703140000_add_points_system.sql is SECURITY DEFINER, exposed as a
-- PostgREST RPC, and executable by PUBLIC (the Postgres default) — so any
-- authenticated user can POST /rest/v1/rpc/award_points directly and:
--
--   • mint unlimited points for themselves. The daily cap only covers the
--     repeatable actions; the high-value one-time ones ('mutual_match' 20,
--     'referral_qualified' 30, 'profile_complete' 50) are deduped solely by
--     UNIQUE (user_id, action_type, ref_id), which a fresh p_ref_id sidesteps
--     on every call — enough to top the leaderboard and unlock point tiers
--     (20260703160000) without doing anything.
--
--   • credit or inflate any *other* account, since p_user_id was never
--     checked against the session.
--
-- Same anti-pattern that was fixed for the referral RPCs in
-- 20260623123000_referral_rpcs_derive_caller.sql, and fixed the same way:
-- derive the target from auth.uid() and stop accepting it from the client.
--
-- Shape after this migration:
--
--   award_points_internal(user_id, action_type, ref_id)        [no client]
--       The original body, behaviour unchanged. REVOKEd from
--       anon/authenticated/PUBLIC, so it is reachable only from the other
--       SECURITY DEFINER functions below — never over PostgREST.
--
--   award_points(action_type, ref_id)                       [authenticated]
--       What the app calls. Derives the user from the session, so a caller
--       can only ever award themselves. The three-argument version is
--       DROPped so no spoofable entry point is left behind.
--
--   award_match_points(match_id)                            [authenticated]
--       The one case where a caller legitimately awards someone else: a
--       mutual match credits both participants. Verifies the caller is one
--       of the two participants first, and takes the user ids from the
--       match row rather than from the client.
--
-- Also restores caller-derivation in grant_referral_reward(): 20260703140000
-- re-created that function from its pre-hardening definition in order to add
-- the referrer's points award, silently reverting the auth.uid() derivation
-- added in 20260623123000 and reopening the referee-slot hijack described
-- there. This migration reinstates it (and switches its internal points call
-- to award_points_internal).
--
-- Deployment note: the client change ships alongside this. In the window
-- between the two, an old client calling award_points with p_user_id gets a
-- "function does not exist" error, which awardPoints() already swallows —
-- so the worst case is a few unawarded points, not a broken action.
--
-- Safe to re-run: every operation is idempotent.
-- ============================================================================


-- ============================================================================
-- SECTION 1: award_points_internal() — the privileged writer
-- ============================================================================
-- Body is verbatim from 20260703140000 Section 2 (point values, daily caps,
-- row lock, ON CONFLICT dedupe). Only the name and the grants change.

CREATE OR REPLACE FUNCTION award_points_internal(p_user_id UUID, p_action_type TEXT, p_ref_id TEXT)
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

-- Not callable by clients. Same lockdown as apply_onboarding_type /
-- increment_onboarding_chat_session_count in 20260702160000.
REVOKE EXECUTE ON FUNCTION award_points_internal(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION award_points_internal(UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION award_points_internal(UUID, TEXT, TEXT) FROM authenticated;


-- ============================================================================
-- SECTION 2: award_points() — caller-derived, replaces the 3-arg version
-- ============================================================================

DROP FUNCTION IF EXISTS award_points(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION award_points(p_action_type TEXT, p_ref_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  SELECT id INTO v_caller_id FROM users WHERE auth_id = auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN; -- unauthenticated, or no profile row yet
  END IF;

  PERFORM award_points_internal(v_caller_id, p_action_type, p_ref_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION award_points(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_points(TEXT, TEXT) TO authenticated;


-- ============================================================================
-- SECTION 3: award_match_points() — awards both sides of a mutual match
-- ============================================================================
-- createMatch() in src/lib/feed.js used to award both participants with two
-- client-supplied ids. Caller-derivation alone can't express that, so this
-- takes only the match id: the participants come from the match row, and the
-- caller must be one of them. A user can therefore award match points only
-- for a match they are actually in, and only the 20 points the match is
-- worth — re-calling is a no-op via the ref_id UNIQUE constraint.

CREATE OR REPLACE FUNCTION award_match_points(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  SELECT id INTO v_caller_id FROM users WHERE auth_id = auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  SELECT user_a_id, user_b_id INTO v_user_a, v_user_b
    FROM matches
    WHERE id = p_match_id
      AND (user_a_id = v_caller_id OR user_b_id = v_caller_id);

  IF NOT FOUND THEN
    RETURN; -- no such match, or the caller isn't a participant
  END IF;

  PERFORM award_points_internal(v_user_a, 'mutual_match', p_match_id::TEXT);
  PERFORM award_points_internal(v_user_b, 'mutual_match', p_match_id::TEXT);
END;
$$;

REVOKE EXECUTE ON FUNCTION award_match_points(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_match_points(UUID) TO authenticated;


-- ============================================================================
-- SECTION 4: grant_referral_reward() — restore caller derivation
-- ============================================================================
-- 20260623123000's hardened body, with 20260703140000's points award kept,
-- now routed through award_points_internal(). p_referee_id stays in the
-- signature (unused) so the existing call site in src/lib/referral.js needs
-- no change — same approach as 20260623123000.

CREATE OR REPLACE FUNCTION grant_referral_reward(p_referee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_referral RECORD;
  v_referrer_premium BOOLEAN;
  v_referrer_days_granted INT;
  v_reward_days CONSTANT INT := 30;
  v_cap CONSTANT INT := 180;
  v_grantable_days INT;
BEGIN
  SELECT id INTO v_caller_id FROM users WHERE auth_id = auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_referral FROM referrals
    WHERE referee_id = v_caller_id AND status = 'pending';

  IF v_referral IS NULL THEN
    RETURN; -- no pending referral for this caller
  END IF;

  -- Referee reward: 7-day trial, regardless of referrer's status
  UPDATE users
    SET referral_premium_until = GREATEST(
          COALESCE(referral_premium_until, NOW()), NOW()
        ) + INTERVAL '7 days'
    WHERE id = v_caller_id;

  -- Referrer reward: only meaningful if referrer isn't already premium via a
  -- real plan. Deliberately NOT is_premium(), which also returns true while a
  -- referral-earned window from a previous reward is still active.
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

  PERFORM award_points_internal(v_referral.referrer_id, 'referral_qualified', v_referral.id::TEXT);
END;
$$;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION (run these in the SQL Editor after the migration)
-- ============================================================================

-- 1. The spoofable signature is gone (should return 'award_points(text, text)'
--    only — no uuid first argument):
--    SELECT p.proname || '(' || pg_get_function_arguments(p.oid) || ')'
--    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public' AND p.proname LIKE 'award_%';

-- 2. Clients cannot reach the privileged writer (both should be false):
--    SELECT has_function_privilege('authenticated',
--             'award_points_internal(uuid, text, text)', 'EXECUTE'),
--           has_function_privilege('anon',
--             'award_points_internal(uuid, text, text)', 'EXECUTE');

-- 3. Clients can still reach the caller-derived entry points (both true):
--    SELECT has_function_privilege('authenticated', 'award_points(text, text)', 'EXECUTE'),
--           has_function_privilege('authenticated', 'award_match_points(uuid)', 'EXECUTE');

-- 4. As a signed-in user (from the app, not the SQL editor — auth.uid() is
--    NULL here), award and read back:
--      SELECT award_points('daily_login', '2026-08-03');
--      SELECT get_points_total('<that-user-uuid>');   -- +5
--    then re-run the same award: total unchanged (ref_id dedupe).

-- 5. Repro of the original issue should now do nothing: calling
--    award_points('mutual_match', gen_random_uuid()::text) still awards only
--    the caller, and there is no longer any way to name another user.


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP FUNCTION IF EXISTS award_match_points(UUID);
-- DROP FUNCTION IF EXISTS award_points(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS award_points_internal(UUID, TEXT, TEXT);
--
-- Then restore award_points(UUID, TEXT, TEXT) and grant_referral_reward()
-- from 20260703140000_add_points_system.sql Sections 2 and 4 — note that
-- doing so reopens both this issue and the referral hijack fixed in
-- 20260623123000, and requires reverting the client back to passing user ids.
