-- ============================================================================
-- Migration: Fix reward_days_granted recorded for already-premium referrers
-- ============================================================================
-- grant_referral_reward() computed v_grantable_days unconditionally and wrote
-- it to referrals.reward_days_granted even when the referrer-premium gate
-- blocked the actual users.referral_premium_until update. This caused
-- already-premium (founding/subscriber) referrers to have a nonzero
-- reward_days_granted recorded despite never receiving any days — which in
-- turn made send-referral-emails send the "you earned N days" email instead
-- of the tier-up acknowledgement.
--
-- Safe to re-run: function redefinition is idempotent; the backfill only
-- touches rows that match the exact bug signature.
-- ============================================================================

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

  IF v_referrer_premium THEN
    v_grantable_days := 0;
  ELSE
    v_grantable_days := LEAST(v_reward_days, v_cap - v_referrer_days_granted);
  END IF;

  IF v_grantable_days > 0 THEN
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
END;
$$;

-- Backfill: zero out reward_days_granted on qualified referrals where the
-- referrer was already premium (founding/subscriber) at the time — they
-- never actually received the days, even though the row says otherwise.
-- Does not touch referral_count_qualified (that increment was always correct).
UPDATE referrals r
SET reward_days_granted = 0
FROM users u
WHERE r.referrer_id = u.id
  AND r.status = 'qualified'
  AND r.reward_days_granted > 0
  AND (u.is_founding_member OR u.plan_status IN ('active', 'past_due'));
