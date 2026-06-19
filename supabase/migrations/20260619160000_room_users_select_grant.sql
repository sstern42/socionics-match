-- =============================================================
-- Socion — Ensure authenticated can SELECT public.users
-- Migration: 20260619160000_room_users_select_grant.sql
--
-- room_messages RLS policies resolve the caller's internal id via
-- subqueries against public.users (e.g. SELECT id FROM users WHERE
-- auth_id = auth.uid()). Those subqueries run as the `authenticated`
-- role, which needs its own SELECT grant on users — independent of
-- the grants on rooms/room_messages/etc. Without it, every room
-- (not just Socion) fails with "permission denied for table users".
-- Idempotent — safe to re-run even if already granted elsewhere
-- (e.g. by 20260619130000_board_grants_fix.sql).
-- =============================================================

GRANT SELECT ON public.users TO authenticated;
