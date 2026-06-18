-- =============================================================
-- Socion — Announce the Boards feature
-- Migration: 20260618150000_announce_boards.sql
--
-- 1. Sets the feed announcement banner to point members at Boards.
-- 2. Posts a pinned founder announcement in the General board.
-- Safe to re-run (announcement upsert is idempotent; the post
-- insert is guarded against duplicates by title+board).
-- =============================================================

UPDATE stats
SET announcement = '🗣️ New: Boards are here — discussion topics open to everyone. Introduce yourself, talk theory, ask for typing help, and more. Check them out →',
    announcement_active = true
WHERE id = 1;

INSERT INTO board_posts (board_id, author_id, title, content, pinned)
SELECT
  b.id,
  u.id,
  'Boards are live 🎉',
  E'Hey everyone — Boards are officially live!\n\nThis is a space for open discussion across the community: introduce yourself, talk through socionics theory, ask for help typing yourself or someone else, debate intertype relations, or just chat about whatever''s on your mind.\n\nA few notes:\n- Anyone can post and comment — no type-gating.\n- React to posts and comments with emoji.\n- You can edit or delete your own posts/comments at any time.\n- Founders/mods can pin important posts (like this one).\n\nMore boards may get added over time based on what the community wants to talk about. Jump in and say hello!\n\n— Spencer',
  true
FROM boards b
JOIN users u ON u.profile_data->>'role' = 'founder'
WHERE b.slug = 'general'
  AND NOT EXISTS (
    SELECT 1 FROM board_posts p
    WHERE p.board_id = b.id AND p.title = 'Boards are live 🎉'
  )
LIMIT 1;
