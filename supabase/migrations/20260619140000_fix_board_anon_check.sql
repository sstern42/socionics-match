-- =============================================================
-- Socion — Fix "permission denied for table users" on board posts
-- Migration: 20260619140000_fix_board_anon_check.sql
--
-- Root cause: board_posts_insert / board_comments_insert checked
-- (SELECT is_anonymous FROM auth.users WHERE id = auth.uid()).
-- The `authenticated` role has no table-level SELECT grant on
-- auth.users, so Postgres rejects the query before RLS is even
-- evaluated ("permission denied for table users" — the schema
-- prefix is omitted in the error text). Reading the same claim
-- from the JWT via auth.jwt() needs no table grant at all.
-- Safe to re-run.
-- =============================================================

DROP POLICY IF EXISTS "board_posts_insert" ON board_posts;
CREATE POLICY "board_posts_insert"
  ON board_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
  );

DROP POLICY IF EXISTS "board_comments_insert" ON board_comments;
CREATE POLICY "board_comments_insert"
  ON board_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
  );
