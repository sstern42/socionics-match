-- ============================================================================
-- Migration: Referral audit-trail log (survives account deletion)
-- ============================================================================
-- Closes #853, a documented follow-up to
-- 20260617160000_fix_referrals_delete_account_fk.sql, which made
-- referrals.referrer_id / referee_id ON DELETE CASCADE so account deletion
-- no longer fails with a foreign-key violation. That fix's tradeoff: the
-- referrals row itself (who referred whom) is silently lost once either
-- side deletes their account, undercounting future referral analytics.
--
-- This implements option 2 from the issue: write a minimal anonymized
-- record (just IDs/timestamps/status, no PII) into referral_deletions_log
-- before the row is cascade-deleted. A BEFORE DELETE trigger directly on
-- `referrals` (rather than on `users`, as the issue sketches) fires for the
-- row no matter which side triggers the delete — direct delete of the
-- referrals row, or cascade from either party's users row — so one trigger
-- covers every path with no special-casing.
--
-- The actual reward (premium days, referral_count_qualified) is already
-- recorded on the surviving party's users row; this log only preserves the
-- historical pairing/status that would otherwise disappear.
--
-- Safe to re-run: idempotent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. referral_deletions_log table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS referral_deletions_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No FK to users — either party may no longer exist by the time this is read.
  referral_id         UUID NOT NULL,
  referrer_id         UUID NOT NULL,
  referee_id          UUID NOT NULL,
  status              TEXT NOT NULL,
  referral_created_at TIMESTAMPTZ,
  qualified_at        TIMESTAMPTZ,
  reward_days_granted INT,
  deleted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_deletions_log_deleted_at
  ON referral_deletions_log(deleted_at);

ALTER TABLE referral_deletions_log ENABLE ROW LEVEL SECURITY;

-- Founders only, same role check as account_deletions / get_admin_stats().
-- No client INSERT/UPDATE/DELETE policy: only the trigger function writes,
-- via SECURITY DEFINER, which bypasses RLS.
DROP POLICY IF EXISTS referral_deletions_log_select_founder ON referral_deletions_log;
CREATE POLICY referral_deletions_log_select_founder ON referral_deletions_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.profile_data->>'role' = 'founder'
    )
  );


-- ----------------------------------------------------------------------------
-- 2. BEFORE DELETE trigger on referrals
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_referral_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO referral_deletions_log (
    referral_id, referrer_id, referee_id, status,
    referral_created_at, qualified_at, reward_days_granted
  ) VALUES (
    OLD.id, OLD.referrer_id, OLD.referee_id, OLD.status,
    OLD.created_at, OLD.qualified_at, OLD.reward_days_granted
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS referrals_log_deletion ON referrals;
CREATE TRIGGER referrals_log_deletion
  BEFORE DELETE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION log_referral_deletion();


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- 1. Confirm the trigger exists:
--    SELECT tgname FROM pg_trigger WHERE tgname = 'referrals_log_deletion';
--
-- 2. Delete a throwaway test referral (or a test user with a referrals row)
--    and confirm the row is archived before disappearing:
--    DELETE FROM referrals WHERE id = '<test-referral-id>';
--    SELECT * FROM referral_deletions_log WHERE referral_id = '<test-referral-id>';


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP TRIGGER IF EXISTS referrals_log_deletion ON referrals;
-- DROP FUNCTION IF EXISTS log_referral_deletion();
-- DROP POLICY IF EXISTS referral_deletions_log_select_founder ON referral_deletions_log;
-- DROP TABLE IF EXISTS referral_deletions_log;
