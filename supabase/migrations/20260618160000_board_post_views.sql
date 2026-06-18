-- =============================================================
-- Socion — View/impression counter on board posts
-- Migration: 20260618160000_board_post_views.sql
--
-- Adds a `views` counter to board_posts. Incremented via a
-- SECURITY DEFINER function rather than an open UPDATE policy,
-- so any authenticated member can register a view without being
-- able to update other columns. The function excludes the post's
-- own author from incrementing their own view count.
-- Safe to re-run.
-- =============================================================

ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS views INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_board_post_view(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id UUID;
  v_author_id UUID;
BEGIN
  SELECT id INTO v_viewer_id FROM users WHERE auth_id = auth.uid();
  IF v_viewer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT author_id INTO v_author_id FROM board_posts WHERE id = p_post_id;
  IF v_author_id IS NULL OR v_author_id = v_viewer_id THEN
    RETURN;
  END IF;

  UPDATE board_posts SET views = views + 1 WHERE id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_board_post_view(UUID) TO authenticated;
