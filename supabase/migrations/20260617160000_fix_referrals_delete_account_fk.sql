-- ============================================================================
-- Migration: Allow account deletion when a referrals row references the user
-- ============================================================================
-- referrals.referrer_id / referee_id reference users(id) with no ON DELETE
-- behavior (defaults to RESTRICT), so deleting any account that has ever
-- been a referrer or referee fails with a foreign-key violation.
--
-- Fix: cascade-delete the referrals row when either party's account is
-- deleted. The actual reward (premium days, referral_count_qualified) is
-- already recorded on the surviving party's users row — only the audit-trail
-- row itself is lost, which is acceptable.
--
-- Safe to re-run: idempotent.
-- ============================================================================

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referrer_id_fkey
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey;
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referee_id_fkey
  FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- Confirm both FKs now cascade:
--   SELECT conname, confdeltype FROM pg_constraint
--   WHERE conname IN ('referrals_referrer_id_fkey', 'referrals_referee_id_fkey');
--   -- confdeltype should be 'c' (cascade) for both


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
-- ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey
--   FOREIGN KEY (referrer_id) REFERENCES users(id);
-- ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey;
-- ALTER TABLE referrals ADD CONSTRAINT referrals_referee_id_fkey
--   FOREIGN KEY (referee_id) REFERENCES users(id);
