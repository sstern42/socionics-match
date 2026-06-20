-- =============================================================
-- Socion — user_reports table
-- Migration: 20260620120000_user_reports.sql
-- Lets any user report another user's profile/behaviour for
-- founder review, independent of the blocks/cooloff system.
-- Safe to re-run.
-- =============================================================

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'other')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution text,
  CONSTRAINT no_self_report CHECK (reporter_id != reported_user_id)
);

CREATE INDEX IF NOT EXISTS user_reports_reporter_idx ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS user_reports_reported_idx ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS user_reports_resolved_idx ON user_reports(resolved_at);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.user_reports TO authenticated;

-- Reporters can create reports about other users
DROP POLICY IF EXISTS "user_reports_insert" ON user_reports;
CREATE POLICY "user_reports_insert"
  ON user_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Reporters can see their own submitted reports
DROP POLICY IF EXISTS "user_reports_read_own" ON user_reports;
CREATE POLICY "user_reports_read_own"
  ON user_reports FOR SELECT
  TO authenticated
  USING (
    reporter_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Founders can read and resolve all reports
DROP POLICY IF EXISTS "user_reports_read_founder" ON user_reports;
CREATE POLICY "user_reports_read_founder"
  ON user_reports FOR SELECT
  TO authenticated
  USING (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  );

DROP POLICY IF EXISTS "user_reports_update_founder" ON user_reports;
CREATE POLICY "user_reports_update_founder"
  ON user_reports FOR UPDATE
  TO authenticated
  USING (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  )
  WITH CHECK (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  );
