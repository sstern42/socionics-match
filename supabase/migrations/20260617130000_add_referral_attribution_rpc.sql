-- ============================================================================
-- Migration: Add Referral Attribution RPC
-- ============================================================================
-- Spec reference: socion-referral-architecture-spec.md v1.4
-- Phase: Days 3-4 — Attribution and gating
--
-- The referrals table (added in 20260617120000) deliberately has no client
-- INSERT policy — writes go through SECURITY DEFINER functions only. This
-- adds the one the client needs: attributing a brand-new account to whoever
-- owns the referral code that was carried through signup.
--
-- Safe to re-run: idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION attribute_referral(p_code TEXT, p_referee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  IF p_code IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_referrer_id FROM users WHERE referral_code = p_code;

  -- No such code, or the code belongs to the new user themselves
  -- (defence in depth alongside the users_no_self_referral_check constraint,
  -- which only guards the users.referred_by_user_id column, not this table).
  IF v_referrer_id IS NULL OR v_referrer_id = p_referee_id THEN
    RETURN;
  END IF;

  -- ON CONFLICT DO NOTHING covers the referee_id UNIQUE constraint: a user
  -- can only ever be attributed once, so a retry (e.g. duplicate call on
  -- page refresh) is silently a no-op rather than an error.
  INSERT INTO referrals (referrer_id, referee_id)
  VALUES (v_referrer_id, p_referee_id)
  ON CONFLICT (referee_id) DO NOTHING;
END;
$$;


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP FUNCTION IF EXISTS attribute_referral(TEXT, UUID);
