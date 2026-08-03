-- =============================================================
-- Socion — Global "Socion" Room (all 16 types, one room)
-- Migration: 20260619_socion_room.sql
-- Adds a single global room alongside the four quadra rooms.
-- Membership is universal: every authenticated, non-anonymous,
-- unmuted user can read and post here regardless of their
-- assigned quadra room. Safe to re-run.
-- =============================================================


-- -------------------------------------------------------------
-- 1. rooms table — allow one global room alongside quadra rooms
-- -------------------------------------------------------------

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE rooms
  ALTER COLUMN quadra DROP NOT NULL;

ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS rooms_quadra_check;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_quadra_check
  CHECK (
    (is_global = FALSE AND quadra IN ('alpha', 'beta', 'gamma', 'delta'))
    OR (is_global = TRUE AND quadra IS NULL)
  );

-- Seed the global room (idempotent — only inserts if no global room exists yet)
INSERT INTO rooms (quadra, is_global)
SELECT NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE is_global);


-- -------------------------------------------------------------
-- 2. RLS policies — room_messages
-- Extend read/insert to also allow the global room regardless
-- of the user's own quadra room assignment.
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "room_messages_read_own_quadra" ON room_messages;
CREATE POLICY "room_messages_read_own_quadra"
  ON room_messages FOR SELECT
  TO authenticated
  USING (
    room_id = (SELECT room_id FROM users WHERE auth_id = auth.uid())
    OR room_id IN (SELECT id FROM rooms WHERE is_global)
  );

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


-- =============================================================
-- Post-migration verification queries (uncomment and run manually)
-- =============================================================

-- 1. Confirm the global room exists
-- SELECT * FROM rooms WHERE is_global;

-- 2. Confirm all five rooms exist
-- SELECT quadra, is_global FROM rooms ORDER BY is_global, quadra;
