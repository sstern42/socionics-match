-- =============================================================
-- Socion — Fix "permission denied for table users" on room messages
-- Migration: 20260619170000_fix_room_anon_check.sql
--
-- Root cause: room_messages_insert_own_quadra checked
-- (SELECT is_anonymous FROM auth.users WHERE id = auth.uid()).
-- The `authenticated` role has no table-level SELECT grant on
-- auth.users, so Postgres rejects the query before RLS is even
-- evaluated ("permission denied for table users" — the schema
-- prefix is omitted in the error text). Reading the same claim
-- from the JWT via auth.jwt() needs no table grant at all.
-- Mirrors 20260619140000_fix_board_anon_check.sql. Safe to re-run.
-- =============================================================

DROP POLICY IF EXISTS "room_messages_insert_own_quadra" ON room_messages;
CREATE POLICY "room_messages_insert_own_quadra"
  ON room_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- sender_id must match the authenticated user's internal id
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    -- must be sending to their own quadra room, or the global Socion room
    AND (
      room_id = (SELECT room_id FROM users WHERE auth_id = auth.uid())
      OR room_id IN (SELECT id FROM rooms WHERE is_global)
    )
    -- anonymous mode users cannot send
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
    -- muted users cannot send
    AND (
      (SELECT room_muted_until FROM users WHERE auth_id = auth.uid()) IS NULL
      OR (SELECT room_muted_until FROM users WHERE auth_id = auth.uid()) < NOW()
    )
  );
