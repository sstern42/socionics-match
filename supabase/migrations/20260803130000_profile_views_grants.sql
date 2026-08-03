-- =============================================================
-- Socion — Fix missing table grants on profile_views
-- Migration: 20260803130000_profile_views_grants.sql
--
-- `profile_views` was created by raw SQL in 20260606_profile_views.sql
-- with RLS enabled and both policies in place, but — like the boards
-- and rooms tables before it (20260619130000_board_grants_fix.sql,
-- 20260619150000_room_grants_fix.sql) — it never received the baseline
-- table GRANTs the `authenticated` role needs. Postgres raises
-- "permission denied for table profile_views" before RLS is even
-- evaluated, so every *read* of the table failed:
--
--   • getProfileViewCount() caught the error and returned 0, which is
--     why the sidebar card reads "Profile viewers 0" for every member.
--   • getProfileViews() (premium "who viewed you" list) threw, and the
--     Views tab rendered its empty state, "No views yet."
--
-- Writes were unaffected: they go through log_profile_view(), which is
-- SECURITY DEFINER and runs as the table owner, so the rows have been
-- accumulating correctly all along — they were simply unreadable.
--
-- INSERT is granted too so the "insert own views" policy from the
-- original migration is reachable, rather than leaving a policy that
-- can never apply. No UPDATE/DELETE: view events are append-only.
-- Safe to re-run.
-- =============================================================

GRANT SELECT, INSERT ON public.profile_views TO authenticated;

-- Needed for the `viewer:viewer_id(...)` embed in getProfileViews().
-- No-op if already granted (20260619160000_room_users_select_grant.sql).
GRANT SELECT ON public.users TO authenticated;
