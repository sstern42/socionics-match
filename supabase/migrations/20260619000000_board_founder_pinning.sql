-- =============================================================
-- Socion — Founder/mod pinning for board posts
-- Migration: 20260619_board_founder_pinning.sql
-- Allows founders to pin/unpin any post, regardless of authorship.
-- Run in Supabase SQL editor. Safe to re-run.
-- =============================================================

DROP POLICY IF EXISTS "board_posts_update_founder" ON board_posts;
CREATE POLICY "board_posts_update_founder"
  ON board_posts FOR UPDATE
  TO authenticated
  USING (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  )
  WITH CHECK (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  );
