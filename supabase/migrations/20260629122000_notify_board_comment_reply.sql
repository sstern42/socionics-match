-- ============================================================================
-- Migration: Notify on Board comment replies
-- ============================================================================
-- Closes #830. createBoardComment() (src/lib/boards.js ~line 154) just
-- inserts the comment row with no follow-up notification, so the post
-- author (or parent-comment author, for threaded replies) has no way to
-- know someone replied unless they manually revisit the thread.
--
-- Adds an AFTER INSERT trigger on board_comments that inserts directly into
-- the existing `notifications` table — the same table src/lib/notifications.js
-- and the bell UI already read from, and the same table the app's realtime
-- subscription (useNotifications.js → postgres_changes on `notifications`)
-- already listens to. A DB-inserted row is indistinguishable from a
-- client-inserted one to the running app, so no frontend change is needed.
--
-- Behaviour:
--   - Top-level comment → notifies the post author.
--   - Threaded reply (parent_comment_id set) → notifies the parent comment's
--     author. If the post author differs from the parent-comment author,
--     both are notified (mirrors "reply to a reply chain" expectations).
--   - Never notifies someone about their own comment.
--   - Skips silently if the post (or parent comment) has no author (e.g.
--     the original author already deleted their account — author_id is
--     ON DELETE SET NULL on both board_posts and board_comments).
--   - Uses notification type 'board_reply'. NotificationBell.jsx's
--     TYPE_META map has no entry for this type yet, so it'll render with a
--     plain fallback label (the raw type string) until the UI is updated —
--     cosmetic only, not a functional gap, and doesn't require a release to
--     work correctly.
--
-- Safe to re-run: idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_board_comment_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post           RECORD;
  v_parent_author  UUID;
  v_commenter      RECORD;
  v_commenter_name TEXT;
  v_preview        TEXT;
  v_action_url     TEXT;
  v_title          TEXT;
BEGIN
  SELECT bp.author_id, b.slug
    INTO v_post
    FROM board_posts bp
    JOIN boards b ON b.id = bp.board_id
    WHERE bp.id = NEW.post_id
      AND bp.deleted_at IS NULL;

  IF v_post IS NULL THEN
    RETURN NEW; -- post not found or soft-deleted; nothing to notify
  END IF;

  v_action_url := '/boards/' || v_post.slug || '/' || NEW.post_id;

  SELECT type, profile_data INTO v_commenter FROM users WHERE id = NEW.author_id;
  v_commenter_name := CASE
    WHEN COALESCE((v_commenter.profile_data->>'anonymous')::boolean, false) THEN NULL
    ELSE v_commenter.profile_data->>'name'
  END;

  v_preview := CASE
    WHEN char_length(NEW.content) > 60 THEN substr(NEW.content, 1, 60) || '…'
    ELSE NEW.content
  END;

  -- Threaded reply: notify the parent comment's author.
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author
      FROM board_comments WHERE id = NEW.parent_comment_id;

    IF v_parent_author IS NOT NULL AND v_parent_author <> NEW.author_id THEN
      v_title := CASE
        WHEN v_commenter_name IS NOT NULL THEN v_commenter_name || ' replied to your comment'
        ELSE 'New reply to your comment'
      END;
      INSERT INTO notifications (user_id, type, title, body, action_url)
      VALUES (v_parent_author, 'board_reply', v_title, v_preview, v_action_url);
    END IF;
  END IF;

  -- Always notify the post author too, unless they're the commenter or were
  -- already just notified above as the parent-comment author.
  IF v_post.author_id IS NOT NULL
     AND v_post.author_id <> NEW.author_id
     AND (v_parent_author IS NULL OR v_post.author_id <> v_parent_author)
  THEN
    v_title := CASE
      WHEN v_commenter_name IS NOT NULL THEN v_commenter_name || ' replied to your post'
      ELSE 'New reply to your post'
    END;
    INSERT INTO notifications (user_id, type, title, body, action_url)
    VALUES (v_post.author_id, 'board_reply', v_title, v_preview, v_action_url);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS board_comments_notify_reply ON board_comments;
CREATE TRIGGER board_comments_notify_reply
  AFTER INSERT ON board_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_board_comment_reply();


-- ============================================================================
-- POST-DEPLOYMENT VERIFICATION
-- ============================================================================
-- 1. Confirm the trigger exists:
--    SELECT tgname FROM pg_trigger WHERE tgname = 'board_comments_notify_reply';
--
-- 2. Post a comment as user B on user A's existing board post and confirm a
--    notification appears for A:
--    SELECT * FROM notifications WHERE type = 'board_reply' ORDER BY created_at DESC LIMIT 5;
--
-- 3. Reply to that comment as user C and confirm BOTH the post author (A)
--    and the parent-comment author (B) get notified (two rows, distinct
--    user_id), and that commenting on your own post/comment notifies no one.


-- ============================================================================
-- ROLLBACK (for emergencies — review carefully before running)
-- ============================================================================
-- DROP TRIGGER IF EXISTS board_comments_notify_reply ON board_comments;
-- DROP FUNCTION IF EXISTS notify_board_comment_reply();
