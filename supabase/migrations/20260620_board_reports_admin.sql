-- =============================================================
-- Socion — Founder access to board_reports for moderation
-- Migration: 20260620_board_reports_admin.sql
-- Allows founders to read all board_reports (not just their own)
-- and resolve them. Run in Supabase SQL editor. Safe to re-run.
-- =============================================================

DROP POLICY IF EXISTS "board_reports_read_founder" ON board_reports;
CREATE POLICY "board_reports_read_founder"
  ON board_reports FOR SELECT
  TO authenticated
  USING (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  );

DROP POLICY IF EXISTS "board_reports_update_founder" ON board_reports;
CREATE POLICY "board_reports_update_founder"
  ON board_reports FOR UPDATE
  TO authenticated
  USING (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  )
  WITH CHECK (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  );
