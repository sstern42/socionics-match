-- ============================================================================
-- Migration: Allow account deletion when a point_transactions row references the user
-- ============================================================================
-- point_transactions.user_id references users(id) with no ON DELETE behavior
-- (defaults to RESTRICT), so deleting any account that has earned even one
-- point (profile completion, a match, a message, a referral, etc.) fails
-- with a foreign-key violation -- both via the app's delete-account flow and
-- via a direct DELETE on auth.users, since the cascade chain
-- (auth.users -> public.users -> point_transactions) breaks at this link.
--
-- Every other FK to users(id) in the schema already specifies ON DELETE
-- CASCADE or SET NULL (see e.g. 20260617160000_fix_referrals_delete_account_fk.sql
-- for the same fix applied to referrals) -- this table was the one gap,
-- introduced by 20260703140000_add_points_system.sql.
--
-- Fix: cascade-delete a user's point_transactions rows when their account is
-- deleted. The ledger is per-user history, not needed once the account itself
-- is gone.
--
-- Safe to re-run: idempotent.
-- ============================================================================

ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_user_id_fkey;
ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- Confirm the FK now cascades:
--   SELECT conname, confdeltype FROM pg_constraint
--   WHERE conname = 'point_transactions_user_id_fkey';
--   -- confdeltype should be 'c' (cascade)


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_user_id_fkey;
-- ALTER TABLE point_transactions ADD CONSTRAINT point_transactions_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES users(id);
