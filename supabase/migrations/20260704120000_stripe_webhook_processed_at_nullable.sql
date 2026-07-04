-- ============================================================================
-- Migration: Make stripe_webhook_events.processed_at a success marker (#926)
-- ============================================================================
-- The stripe-webhook function logged every event on receipt with
-- processed_at DEFAULT NOW(), then routed to a handler. If the handler threw,
-- the function returned 500 so Stripe would retry -- but the retry hit the
-- idempotency check, found the already-logged row, and short-circuited with
-- "already processed". The handler never re-ran, so a transient failure (e.g.
-- a Supabase write hiccup during checkout.session.completed) could leave a
-- paying user without plan_status='active', invisibly.
--
-- Fix: processed_at now means "the handler completed successfully", not
-- "the event was received". It becomes nullable with no default; the function
-- inserts the row with processed_at = NULL, runs the handler, and only then
-- stamps processed_at. The idempotency check skips an event only when
-- processed_at IS NOT NULL, so a previously-failed event is retried.
--
-- Existing rows were written under the old logic (all successfully processed
-- at the time), so their non-null processed_at correctly reads as "done" --
-- no backfill needed.
--
-- Safe to re-run: idempotent.
-- ============================================================================

ALTER TABLE stripe_webhook_events
  ALTER COLUMN processed_at DROP NOT NULL,
  ALTER COLUMN processed_at DROP DEFAULT;


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- Confirm the column is now nullable with no default:
--   SELECT is_nullable, column_default FROM information_schema.columns
--   WHERE table_name = 'stripe_webhook_events' AND column_name = 'processed_at';
--   -- is_nullable should be 'YES', column_default should be NULL


-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- UPDATE stripe_webhook_events SET processed_at = NOW() WHERE processed_at IS NULL;
-- ALTER TABLE stripe_webhook_events
--   ALTER COLUMN processed_at SET DEFAULT NOW(),
--   ALTER COLUMN processed_at SET NOT NULL;
