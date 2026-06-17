-- ============================================================================
-- Migration: Add Referral Programme Support
-- ============================================================================
-- Spec reference: socion-referral-architecture-spec.md v1.4
-- Phase: Days 1-2 — Infrastructure
--
-- Adds:
--   • users columns for referral code, attribution, and reward tracking
--   • referral_code generation trigger
--   • referrals table
--   • is_premium() updated with referral-earned-premium clause
--   • grant_referral_reward() — fires on referee's qualifying action
--   • referral_tier() — drives badge/leaderboard/painted-door UI
--
-- Does NOT add (Phase 2, deferred per spec Section 6 graduation rule):
--   • referral_typing_discount_claimed_at / referral_top_tier_claimed_at columns
--   • Stripe Coupon + Promotion Code claim mechanics
--
-- Safe to re-run: every operation is idempotent.
-- ============================================================================


-- ============================================================================
-- SECTION 1: users table additions
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS referral_premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_premium_days_granted INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_count_qualified INT DEFAULT 0;

-- Idempotent CHECK constraint blocking self-referral at the data layer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_no_self_referral_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_no_self_referral_check
      CHECK (referred_by_user_id IS NULL OR referred_by_user_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_user_id);


-- ============================================================================
-- SECTION 2: Referral code generation trigger
-- ============================================================================
-- 8-character codes derived from id + insert-time clock are short enough for
-- a clean /r/{code} link; collision risk is negligible at this scale, so no
-- uniqueness retry loop yet (per spec Section 2).

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := substr(md5(NEW.id::text || clock_timestamp()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_generate_referral_code ON users;
CREATE TRIGGER users_generate_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Backfill existing users: the trigger only fires on INSERT, so without this
-- every pre-existing account would have referral_code = NULL indefinitely
-- and be unable to use the invite panel. Idempotent: only touches NULLs.
UPDATE users
SET referral_code = substr(md5(id::text || clock_timestamp()::text), 1, 8)
WHERE referral_code IS NULL;


-- ============================================================================
-- SECTION 3: referrals table
-- ============================================================================
-- referee_id is UNIQUE — each account can only ever be someone's referee
-- once, which is what blocks retroactive or duplicate attribution.

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referee_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rewarded', 'invalid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  reward_days_granted INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users may read referral rows where they're the referrer (for their own
-- invite-panel tally) or the referee. All writes go through
-- grant_referral_reward() (SECURITY DEFINER) or the service role — no client
-- INSERT/UPDATE/DELETE policy is added.
DROP POLICY IF EXISTS referrals_select_own ON referrals;
CREATE POLICY referrals_select_own ON referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);


-- ============================================================================
-- SECTION 4: is_premium() — add referral-earned-premium clause
-- ============================================================================
-- Extends the existing function with one additional OR clause; founding
-- member and Stripe plan_status checks are unchanged. Referral-earned
-- premium is intentionally kept separate from plan_status/Stripe — when
-- referral_premium_until passes, the user reverts to their real plan status
-- with no further action needed.

CREATE OR REPLACE FUNCTION is_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_founding_member
         OR plan_status IN ('active', 'past_due')
         OR (referral_premium_until IS NOT NULL AND referral_premium_until > NOW())
     FROM users
     WHERE id = p_user_id),
    FALSE
  );
$$;


-- ============================================================================
-- SECTION 5: grant_referral_reward()
-- ============================================================================
-- Called explicitly from the app once onboarding completes (type + purpose
-- selected, within 7 days of signup) — not from a DB trigger, since
-- onboarding completion is an app-level event rather than a single column
-- flip. No-ops safely if there's no pending referral for the referee.
--
-- Referee always gets the 7-day trial. Referrer gets up to 30 days, capped
-- at 180 cumulative days tracked via referral_premium_days_granted (never
-- reset). referral_count_qualified always increments for badge/tier
-- purposes, even once a free-tier referrer has hit the cap, and even when
-- the referrer is already premium (extra days would be wasted, so none are
-- granted).

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

  -- Referrer reward: only meaningful if referrer isn't already premium
  SELECT is_premium(v_referral.referrer_id), referral_premium_days_granted
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
END;
$$;


-- ============================================================================
-- SECTION 6: referral_tier()
-- ============================================================================
-- Drives both the live badges (1+ connector, 3+ networker) and the
-- painted-door "Coming soon" state (5+ catalyst, 10+ catalyst_plus) off the
-- same referral_count_qualified counter, tracked from day one regardless of
-- which tiers are actually claimable in the UI.

CREATE OR REPLACE FUNCTION referral_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN referral_count_qualified >= 10 THEN 'catalyst_plus'
    WHEN referral_count_qualified >= 5  THEN 'catalyst'
    WHEN referral_count_qualified >= 3  THEN 'networker'
    WHEN referral_count_qualified >= 1  THEN 'connector'
    ELSE NULL
  END
  FROM users WHERE id = p_user_id;
$$;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION (run these in the SQL Editor after the migration)
-- ============================================================================

-- 1. Confirm new users columns exist:
--    SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'users'
--      AND column_name IN ('referral_code', 'referred_by_user_id',
--                          'referral_premium_until', 'referral_premium_days_granted',
--                          'referral_count_qualified');

-- 2. Confirm every user (existing and new) has a referral_code — should
--    return 0:
--    SELECT count(*) FROM users WHERE referral_code IS NULL;

-- 3. Confirm self-referral is blocked:
--    UPDATE users SET referred_by_user_id = id WHERE id = (SELECT id FROM users LIMIT 1);
--    -- should raise users_no_self_referral_check violation

-- 4. Spot-check referral_tier() across thresholds:
--    SELECT id, referral_count_qualified, referral_tier(id) FROM users
--    WHERE referral_count_qualified > 0 LIMIT 5;

-- 5. Confirm functions are callable:
--    SELECT routine_name, security_type
--    FROM information_schema.routines
--    WHERE routine_name IN ('is_premium', 'grant_referral_reward',
--                           'referral_tier', 'generate_referral_code');


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP TRIGGER IF EXISTS users_generate_referral_code ON users;
-- DROP FUNCTION IF EXISTS generate_referral_code();
-- DROP FUNCTION IF EXISTS grant_referral_reward(UUID);
-- DROP FUNCTION IF EXISTS referral_tier(UUID);
-- DROP POLICY IF EXISTS referrals_select_own ON referrals;
-- DROP TABLE IF EXISTS referrals;
-- DROP INDEX IF EXISTS idx_users_referral_code;
-- DROP INDEX IF EXISTS idx_users_referred_by;
-- ALTER TABLE users
--   DROP CONSTRAINT IF EXISTS users_no_self_referral_check,
--   DROP COLUMN IF EXISTS referral_code,
--   DROP COLUMN IF EXISTS referred_by_user_id,
--   DROP COLUMN IF EXISTS referral_premium_until,
--   DROP COLUMN IF EXISTS referral_premium_days_granted,
--   DROP COLUMN IF EXISTS referral_count_qualified;
--
-- Then restore is_premium() to its pre-referral definition from
-- 20260527120000_add_premium_subscription_support.sql Section 4.
