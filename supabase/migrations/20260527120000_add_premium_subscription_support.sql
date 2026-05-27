-- ============================================================================
-- Migration: Add Premium Subscription Support
-- ============================================================================
-- Spec reference: socion-premium-architecture-spec.md v1.2
-- Phase: Week 1 / Day 2 — Infrastructure
-- Founding cutoff: 15 June 2026, end of day UTC (speculative — adjust if PH
--                  launch date shifts)
--
-- Schema verified against existing Socion repo (matches table, user_a_id /
-- user_b_id columns, no status column on matches).
--
-- Adds:
--   • users columns for plan status, Stripe IDs, founding member flag
--   • Founding member assignment trigger + backfill (cutoff 2026-06-15 23:59:59 UTC)
--   • is_premium() helper function
--   • can_add_connection() helper function
--   • messages.read_at column for read receipts
--   • stripe_webhook_events table for webhook idempotency
--
-- Does NOT add:
--   • RLS policy changes (deferred to Week 2 gating work)
--   • Front-end gating logic
--
-- Safe to re-run: every operation is idempotent.
-- ============================================================================


-- ============================================================================
-- SECTION 1: users table additions
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_current_period_end TIMESTAMPTZ;

-- Idempotent CHECK constraint on plan_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_plan_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_plan_status_check
      CHECK (plan_status IN ('free', 'active', 'past_due', 'canceled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_plan_status ON users(plan_status);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);


-- ============================================================================
-- SECTION 2: Founding member trigger
-- ============================================================================
-- Cutoff: 15 June 2026 23:59:59 UTC
-- Anyone with users.created_at before this becomes a founding member
-- (permanent free premium). Set once at INSERT; never recalculated.

CREATE OR REPLACE FUNCTION set_founding_member_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  founding_cutoff CONSTANT TIMESTAMPTZ := '2026-06-15 23:59:59+00';
BEGIN
  IF NEW.created_at < founding_cutoff THEN
    NEW.is_founding_member := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_founding_member ON users;
CREATE TRIGGER users_set_founding_member
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_founding_member_on_signup();


-- ============================================================================
-- SECTION 3: Backfill existing members
-- ============================================================================
-- Applies founding status to all existing users (created before cutoff).
-- Idempotent: skips rows already marked.
--
-- Expected backfill total: 136+ (your current sign-up count). Verify against
-- the post-deployment count query at the bottom of this file.

UPDATE users
SET is_founding_member = TRUE
WHERE created_at < '2026-06-15 23:59:59+00'::timestamptz
  AND is_founding_member = FALSE;


-- ============================================================================
-- SECTION 4: Premium check function
-- ============================================================================
-- Returns TRUE if the user has effective premium access:
--   • Founding member (permanent free premium), OR
--   • Active Stripe subscription, OR
--   • Past-due (preserves access during Stripe dunning grace period)
--
-- COALESCE to FALSE handles non-existent user IDs safely.

CREATE OR REPLACE FUNCTION is_premium(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_founding_member OR plan_status IN ('active', 'past_due')
     FROM users
     WHERE id = p_user_id),
    FALSE
  );
$$;


-- ============================================================================
-- SECTION 5: Connection cap function
-- ============================================================================
-- Returns TRUE if the user can add another match.
--   • Premium users: always TRUE (no cap)
--   • Free users: TRUE if their current match count < 5
--
-- Uses your existing matches table. Every matches row represents an active
-- connection (no status column needed). Counts rows where the user is in
-- either user_a_id or user_b_id position, since matches are bidirectional
-- (one row per pair, enforced by matches_pair_unique index).

CREATE OR REPLACE FUNCTION can_add_connection(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN is_premium(p_user_id) THEN TRUE
    WHEN (
      SELECT count(*)
      FROM matches
      WHERE user_a_id = p_user_id OR user_b_id = p_user_id
    ) < 5 THEN TRUE
    ELSE FALSE
  END;
$$;


-- ============================================================================
-- SECTION 6: messages.read_at for read receipts
-- ============================================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Partial index optimised for "unread messages" queries
CREATE INDEX IF NOT EXISTS idx_messages_read_at_null
  ON messages(read_at)
  WHERE read_at IS NULL;


-- ============================================================================
-- SECTION 7: Stripe webhook idempotency table
-- ============================================================================
-- Used by the stripe-webhook edge function to prevent double-processing
-- when Stripe retries delivery of the same event.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

-- Optional cleanup (run periodically or via Supabase cron):
--   DELETE FROM stripe_webhook_events
--   WHERE processed_at < NOW() - INTERVAL '30 days';


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION (run these in the SQL Editor after the migration)
-- ============================================================================

-- 1. Confirm founding member backfill (should match current sign-up count, ~136):
--    SELECT count(*) FROM users WHERE is_founding_member = TRUE;

-- 2. Spot-check is_premium for any existing member (should return TRUE):
--    SELECT id, is_founding_member, is_premium(id) FROM users LIMIT 3;

-- 3. Confirm new columns exist:
--    SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'users'
--      AND column_name IN ('is_founding_member', 'plan_status', 'stripe_customer_id',
--                          'stripe_subscription_id', 'premium_started_at',
--                          'premium_current_period_end');

-- 4. Confirm trigger is active:
--    SELECT trigger_name, event_manipulation
--    FROM information_schema.triggers
--    WHERE event_object_table = 'users'
--      AND trigger_name = 'users_set_founding_member';

-- 5. Confirm functions are callable:
--    SELECT routine_name, security_type
--    FROM information_schema.routines
--    WHERE routine_name IN ('is_premium', 'can_add_connection',
--                           'set_founding_member_on_signup');


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP TRIGGER IF EXISTS users_set_founding_member ON users;
-- DROP FUNCTION IF EXISTS set_founding_member_on_signup();
-- DROP FUNCTION IF EXISTS is_premium(UUID);
-- DROP FUNCTION IF EXISTS can_add_connection(UUID);
-- DROP TABLE IF EXISTS stripe_webhook_events;
-- DROP INDEX IF EXISTS idx_messages_read_at_null;
-- DROP INDEX IF EXISTS idx_users_plan_status;
-- DROP INDEX IF EXISTS idx_users_stripe_customer;
-- ALTER TABLE messages DROP COLUMN IF EXISTS read_at;
-- ALTER TABLE users
--   DROP CONSTRAINT IF EXISTS users_plan_status_check,
--   DROP COLUMN IF EXISTS is_founding_member,
--   DROP COLUMN IF EXISTS plan_status,
--   DROP COLUMN IF EXISTS stripe_customer_id,
--   DROP COLUMN IF EXISTS stripe_subscription_id,
--   DROP COLUMN IF EXISTS premium_started_at,
--   DROP COLUMN IF EXISTS premium_current_period_end;
