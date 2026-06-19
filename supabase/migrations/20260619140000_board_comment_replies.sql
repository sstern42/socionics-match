-- =============================================================
-- Socion — Boards: one-level comment replies
-- Migration: 20260619140000_board_comment_replies.sql
-- Adds parent_comment_id so a comment can reply to another top-level
-- comment. Replies cannot themselves be replied to (enforced in app).
-- =============================================================

ALTER TABLE board_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES board_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_board_comments_parent
  ON board_comments(parent_comment_id);
