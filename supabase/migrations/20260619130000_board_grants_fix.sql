-- =============================================================
-- Socion — Fix missing table grants on Boards tables
-- Migration: 20260619130000_board_grants_fix.sql
-- Tables created via raw SQL don't automatically inherit the
-- default privileges Supabase's dashboard applies to tables
-- created through the Table Editor. RLS policies still gate row
-- access, but the role needs baseline GRANTs to even attempt the
-- query — without them Postgres throws "permission denied for
-- table X" before RLS is even evaluated.
-- Safe to re-run.
-- =============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_posts              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_comments           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_post_reactions     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_comment_reactions  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_reports            TO authenticated;

-- Belt-and-suspenders: confirm authenticated can still read users
-- (needed for the author:author_id embed in board_posts/board_comments
-- queries). No-op if already granted.
GRANT SELECT ON public.users TO authenticated;
