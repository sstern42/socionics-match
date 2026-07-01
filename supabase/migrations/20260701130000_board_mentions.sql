-- ============================================================================
-- Migration: @ mentions in Board posts and comments
-- ============================================================================
-- Closes #829. Adds a mentioned_user_ids column to board_posts/board_comments,
-- populated client-side by the mention autocomplete in the composer
-- (src/components/boards/MentionTextarea.jsx via src/lib/mentions.js), and an
-- AFTER INSERT trigger that notifies each mentioned user by inserting
-- directly into the existing `notifications` table — same pattern as
-- 20260629122000_notify_board_comment_reply.sql.
--
-- mentioned_user_ids is populated by the app, not parsed server-side from
-- `content` — the composer records the id of whichever user was actually
-- selected from the autocomplete dropdown, so this stays correct even if two
-- users share a display name.
--
-- Safe to re-run: idempotent.
-- ============================================================================

ALTER TABLE board_posts
  ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] DEFAULT '{}';

ALTER TABLE board_comments
  ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] DEFAULT '{}';


CREATE OR REPLACE FUNCTION notify_board_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug                TEXT;
  v_post_id             UUID;
  v_author_profile_data JSONB;
  v_author_name         TEXT;
  v_preview             TEXT;
  v_action_url          TEXT;
  v_title               TEXT;
  v_mentioned           UUID;
BEGIN
  IF NEW.mentioned_user_ids IS NULL OR array_length(NEW.mentioned_user_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'board_posts' THEN
    v_post_id := NEW.id;
    SELECT slug INTO v_slug FROM boards WHERE id = NEW.board_id;
  ELSE
    v_post_id := NEW.post_id;
    SELECT b.slug INTO v_slug
      FROM board_posts bp JOIN boards b ON b.id = bp.board_id
      WHERE bp.id = NEW.post_id
        AND bp.deleted_at IS NULL;
  END IF;

  IF v_slug IS NULL THEN
    RETURN NEW; -- board/post not found or soft-deleted; nothing to notify
  END IF;

  v_action_url := '/boards/' || v_slug || '/' || v_post_id;

  SELECT profile_data INTO v_author_profile_data FROM users WHERE id = NEW.author_id;
  v_author_name := CASE
    WHEN COALESCE((v_author_profile_data->>'anonymous')::boolean, false) THEN NULL
    ELSE v_author_profile_data->>'name'
  END;

  v_preview := CASE
    WHEN char_length(NEW.content) > 60 THEN substr(NEW.content, 1, 60) || '…'
    ELSE NEW.content
  END;

  v_title := CASE
    WHEN v_author_name IS NOT NULL THEN v_author_name || ' mentioned you'
    ELSE 'You were mentioned'
  END;

  FOREACH v_mentioned IN ARRAY NEW.mentioned_user_ids LOOP
    IF v_mentioned IS NOT NULL AND v_mentioned <> NEW.author_id THEN
      INSERT INTO notifications (user_id, type, title, body, action_url)
      VALUES (v_mentioned, 'board_mention', v_title, v_preview, v_action_url);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS board_posts_notify_mentions ON board_posts;
CREATE TRIGGER board_posts_notify_mentions
  AFTER INSERT ON board_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_board_mentions();

DROP TRIGGER IF EXISTS board_comments_notify_mentions ON board_comments;
CREATE TRIGGER board_comments_notify_mentions
  AFTER INSERT ON board_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_board_mentions();


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- 1. Confirm the columns and triggers exist:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name IN ('board_posts','board_comments') AND column_name = 'mentioned_user_ids';
--    SELECT tgname FROM pg_trigger WHERE tgname LIKE 'board_%_notify_mentions';
--
-- 2. Create a post/comment with mentioned_user_ids containing another user's
--    id and confirm a 'board_mention' notification appears for them:
--    SELECT * FROM notifications WHERE type = 'board_mention' ORDER BY created_at DESC LIMIT 5;


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP TRIGGER IF EXISTS board_posts_notify_mentions ON board_posts;
-- DROP TRIGGER IF EXISTS board_comments_notify_mentions ON board_comments;
-- DROP FUNCTION IF EXISTS notify_board_mentions();
-- ALTER TABLE board_posts DROP COLUMN IF EXISTS mentioned_user_ids;
-- ALTER TABLE board_comments DROP COLUMN IF EXISTS mentioned_user_ids;
