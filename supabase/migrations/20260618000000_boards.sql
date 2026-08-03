-- =============================================================
-- Socion — Boards (forum-style discussion topics)
-- Migration: 20260618_boards.sql
-- Founder/mod-curated boards, open to all members for posting.
-- Run in Supabase SQL editor. Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- =============================================================


-- -------------------------------------------------------------
-- 1. boards table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS boards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO boards (slug, name, description, sort_order) VALUES
  ('introductions',   'Introductions',        'New here? Say hello and introduce yourself.', 0),
  ('type-discussions', 'Type Discussions',     'Talk about specific socionics types and how they show up in real life.', 1),
  ('theory-typing',   'Theory & Typing Help',  'Ask for help typing yourself or others, and discuss socionics theory.', 2),
  ('relationships',   'Relationship Advice',   'Discuss intertype relations, dating, and compatibility.', 3),
  ('general',         'General Discussion',    'Anything else Socion-related.', 4)
ON CONFLICT (slug) DO NOTHING;


-- -------------------------------------------------------------
-- 2. board_posts table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS board_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  author_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  title      TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at  TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_board_posts_board_created
  ON board_posts(board_id, pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_board_posts_author
  ON board_posts(author_id);


-- -------------------------------------------------------------
-- 3. board_comments table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS board_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  author_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at  TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_board_comments_post_created
  ON board_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_board_comments_author
  ON board_comments(author_id);


-- -------------------------------------------------------------
-- 4. Reactions (same pattern as room_message_reactions)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS board_post_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_board_post_reactions_post ON board_post_reactions(post_id);
ALTER TABLE board_post_reactions REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS board_comment_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES board_comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (char_length(emoji) <= 8),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_board_comment_reactions_comment ON board_comment_reactions(comment_id);
ALTER TABLE board_comment_reactions REPLICA IDENTITY FULL;


-- -------------------------------------------------------------
-- 5. board_reports table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS board_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID REFERENCES board_posts(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES board_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution  TEXT,
  CHECK ((post_id IS NOT NULL) <> (comment_id IS NOT NULL))
);


-- -------------------------------------------------------------
-- 6. Enable RLS
-- -------------------------------------------------------------

ALTER TABLE boards                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_post_reactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_reports           ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------
-- 7. RLS — boards
-- Any authenticated user can read active boards.
-- No insert/update/delete by users — managed via service role.
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "boards_read_authenticated" ON boards;
CREATE POLICY "boards_read_authenticated"
  ON boards FOR SELECT
  TO authenticated
  USING (is_active);


-- -------------------------------------------------------------
-- 8. RLS — board_posts
-- Open access: any authenticated, non-anonymous member can read/post.
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "board_posts_read" ON board_posts;
CREATE POLICY "board_posts_read"
  ON board_posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "board_posts_insert" ON board_posts;
CREATE POLICY "board_posts_insert"
  ON board_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND (SELECT is_anonymous FROM auth.users WHERE id = auth.uid()) IS NOT TRUE
  );

DROP POLICY IF EXISTS "board_posts_update_own" ON board_posts;
CREATE POLICY "board_posts_update_own"
  ON board_posts FOR UPDATE
  TO authenticated
  USING (author_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (author_id = (SELECT id FROM users WHERE auth_id = auth.uid()));


-- -------------------------------------------------------------
-- 9. RLS — board_comments
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "board_comments_read" ON board_comments;
CREATE POLICY "board_comments_read"
  ON board_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "board_comments_insert" ON board_comments;
CREATE POLICY "board_comments_insert"
  ON board_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND (SELECT is_anonymous FROM auth.users WHERE id = auth.uid()) IS NOT TRUE
  );

DROP POLICY IF EXISTS "board_comments_update_own" ON board_comments;
CREATE POLICY "board_comments_update_own"
  ON board_comments FOR UPDATE
  TO authenticated
  USING (author_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (author_id = (SELECT id FROM users WHERE auth_id = auth.uid()));


-- -------------------------------------------------------------
-- 10. RLS — reactions (mirrors room_message_reactions policy shape)
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "board_post_reactions_select" ON board_post_reactions;
CREATE POLICY "board_post_reactions_select"
  ON board_post_reactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "board_post_reactions_insert" ON board_post_reactions;
CREATE POLICY "board_post_reactions_insert"
  ON board_post_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "board_post_reactions_delete" ON board_post_reactions;
CREATE POLICY "board_post_reactions_delete"
  ON board_post_reactions FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "board_comment_reactions_select" ON board_comment_reactions;
CREATE POLICY "board_comment_reactions_select"
  ON board_comment_reactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "board_comment_reactions_insert" ON board_comment_reactions;
CREATE POLICY "board_comment_reactions_insert"
  ON board_comment_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "board_comment_reactions_delete" ON board_comment_reactions;
CREATE POLICY "board_comment_reactions_delete"
  ON board_comment_reactions FOR DELETE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));


-- -------------------------------------------------------------
-- 11. RLS — board_reports
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "board_reports_insert" ON board_reports;
CREATE POLICY "board_reports_insert"
  ON board_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "board_reports_read_own" ON board_reports;
CREATE POLICY "board_reports_read_own"
  ON board_reports FOR SELECT
  TO authenticated
  USING (reporter_id = (SELECT id FROM users WHERE auth_id = auth.uid()));


-- =============================================================
-- Post-migration verification queries (uncomment and run manually)
-- =============================================================

-- SELECT * FROM boards ORDER BY sort_order;
-- SELECT b.name, COUNT(p.id) AS post_count
-- FROM boards b LEFT JOIN board_posts p ON p.board_id = b.id
-- GROUP BY b.name ORDER BY b.name;
