-- ============================================================================
-- Migration: Account deletion audit log
-- ============================================================================
-- Closes #854. There is currently no record kept of when a user deletes
-- their account — once a `users` row is gone (and cascades remove related
-- data, e.g. referrals per #853), admins/support have no way to answer
-- basic questions like "did this user delete their account?" or "how many
-- accounts churned this month?".
--
-- Adds a lightweight `account_deletions` log table populated via a
-- BEFORE DELETE trigger on `users`, so the log entry is written in the same
-- transaction as the delete and survives it regardless of whether the
-- delete is issued directly against `users` or cascades down from an
-- `auth.users` deletion (e.g. via the delete-account edge function calling
-- supabase.auth.admin.deleteUser).
--
-- Deliberately excludes PII (name/bio/location live in profile_data and are
-- not copied). Only non-PII metadata useful for support/analytics is kept.
--
-- deletion_source is best-effort, not exact — documented limitation:
--   - 'self_authenticated'   — the deleting session's auth.uid() matches the
--     deleted row's auth_id, i.e. a direct authenticated self-delete.
--   - 'service_role_or_admin' — auth.uid() is NULL (no PostgREST JWT in
--     scope) or doesn't match. This covers BOTH the current self-service
--     deletion path (the edge function deletes via the service role, which
--     has no JWT claims) AND a genuine admin/moderation deletion run via
--     the SQL editor or service role. Distinguishing those two would
--     require the application to pass an explicit flag through to Postgres
--     (e.g. a session var set from the edge function), which is a code
--     change — out of scope for this SQL-only fix. Flagged here per #854's
--     acceptance criteria ("decision documented if this is deferred").
--
-- Safe to re-run: idempotent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. account_deletions table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS account_deletions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No FK to users/auth.users — the whole point is to survive their deletion.
  deleted_user_id    UUID NOT NULL,
  deleted_auth_id    UUID,
  account_created_at TIMESTAMPTZ,
  type               TEXT,
  purpose            TEXT[],
  plan_status        TEXT,
  is_founding_member BOOLEAN,
  deletion_source    TEXT NOT NULL
    CHECK (deletion_source IN ('self_authenticated', 'service_role_or_admin')),
  deleted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_deleted_at
  ON account_deletions(deleted_at);

ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

-- Founders only — same role check used by get_admin_stats(). No client
-- INSERT/UPDATE/DELETE policy: only the trigger function writes, via
-- SECURITY DEFINER, which bypasses RLS.
DROP POLICY IF EXISTS account_deletions_select_founder ON account_deletions;
CREATE POLICY account_deletions_select_founder ON account_deletions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
        AND users.profile_data->>'role' = 'founder'
    )
  );


-- ----------------------------------------------------------------------------
-- 2. BEFORE DELETE trigger on users
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_account_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source TEXT;
BEGIN
  v_source := CASE
    WHEN auth.uid() IS NOT NULL AND auth.uid() = OLD.auth_id THEN 'self_authenticated'
    ELSE 'service_role_or_admin'
  END;

  INSERT INTO account_deletions (
    deleted_user_id, deleted_auth_id, account_created_at,
    type, purpose, plan_status, is_founding_member, deletion_source
  ) VALUES (
    OLD.id, OLD.auth_id, OLD.created_at,
    OLD.type, OLD.purpose, OLD.plan_status, OLD.is_founding_member, v_source
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS users_log_account_deletion ON users;
CREATE TRIGGER users_log_account_deletion
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_account_deletion();


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- 1. Confirm the table and trigger exist:
--    SELECT tgname FROM pg_trigger WHERE tgname = 'users_log_account_deletion';
--
-- 2. Delete a throwaway test user and confirm a row appears:
--    DELETE FROM users WHERE id = '<test-user-id>';
--    SELECT * FROM account_deletions WHERE deleted_user_id = '<test-user-id>';
--
-- 3. Churn-by-period query example:
--    SELECT date_trunc('week', deleted_at) AS week, count(*)
--    FROM account_deletions GROUP BY 1 ORDER BY 1 DESC;


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP TRIGGER IF EXISTS users_log_account_deletion ON users;
-- DROP FUNCTION IF EXISTS log_account_deletion();
-- DROP POLICY IF EXISTS account_deletions_select_founder ON account_deletions;
-- DROP TABLE IF EXISTS account_deletions;
