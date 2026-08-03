-- =============================================================
-- Socion — Quadra Group Rooms
-- Migration: 20260602_quadra_rooms.sql
-- Phase 1: schema, seed, trigger, backfill, RLS
-- Run in Supabase SQL editor. Safe to re-run (all statements
-- use IF NOT EXISTS or OR REPLACE).
-- =============================================================


-- -------------------------------------------------------------
-- 1. rooms table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quadra     TEXT NOT NULL UNIQUE
               CHECK (quadra IN ('alpha', 'beta', 'gamma', 'delta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the four quadra rooms
INSERT INTO rooms (quadra) VALUES
  ('alpha'),
  ('beta'),
  ('gamma'),
  ('delta')
ON CONFLICT (quadra) DO NOTHING;


-- -------------------------------------------------------------
-- 2. room_messages table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS room_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at  TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ  -- soft delete; content replaced on read
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_created
  ON room_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_messages_sender
  ON room_messages(sender_id);


-- -------------------------------------------------------------
-- 3. room_reports table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS room_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES room_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution  TEXT
);


-- -------------------------------------------------------------
-- 4. users table additions
-- -------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS room_id         UUID REFERENCES rooms(id),
  ADD COLUMN IF NOT EXISTS room_muted_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_room ON users(room_id);


-- -------------------------------------------------------------
-- 5. Room assignment trigger
-- Fires on INSERT and on UPDATE OF type.
-- Derives quadra from type, looks up the corresponding room id,
-- and sets users.room_id. If type is null or unrecognised,
-- room_id is left null.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION assign_quadra_room()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quadra  TEXT;
  v_room_id UUID;
BEGIN
  SELECT t.quadra INTO v_quadra
  FROM (VALUES
    ('ILE','alpha'), ('SEI','alpha'), ('ESE','alpha'), ('LII','alpha'),
    ('SLE','beta'),  ('IEI','beta'),  ('EIE','beta'),  ('LSI','beta'),
    ('SEE','gamma'), ('ILI','gamma'), ('LIE','gamma'), ('ESI','gamma'),
    ('LSE','delta'), ('EII','delta'), ('IEE','delta'), ('SLI','delta')
  ) AS t(type_code, quadra)
  WHERE t.type_code = NEW.type;

  IF v_quadra IS NOT NULL THEN
    SELECT id INTO v_room_id FROM rooms WHERE quadra = v_quadra;
    NEW.room_id := v_room_id;
  ELSE
    -- Type unset or unrecognised — leave room_id null
    NEW.room_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_assign_quadra_room ON users;
CREATE TRIGGER users_assign_quadra_room
  BEFORE INSERT OR UPDATE OF type
  ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_quadra_room();


-- -------------------------------------------------------------
-- 6. Backfill existing users
-- Direct UPDATE via subquery — more reliable than re-firing
-- the trigger on existing rows.
-- -------------------------------------------------------------

UPDATE users
SET room_id = r.id
FROM (VALUES
  ('ILE','alpha'), ('SEI','alpha'), ('ESE','alpha'), ('LII','alpha'),
  ('SLE','beta'),  ('IEI','beta'),  ('EIE','beta'),  ('LSI','beta'),
  ('SEE','gamma'), ('ILI','gamma'), ('LIE','gamma'), ('ESI','gamma'),
  ('LSE','delta'), ('EII','delta'), ('IEE','delta'), ('SLI','delta')
) AS t(type_code, quadra)
JOIN rooms r ON r.quadra = t.quadra
WHERE users.type = t.type_code
  AND users.room_id IS NULL;  -- skip any already assigned

-- Verification: run this after migration to confirm counts look right
-- SELECT r.quadra, COUNT(u.id) AS member_count
-- FROM rooms r
-- LEFT JOIN users u ON u.room_id = r.id
-- GROUP BY r.quadra
-- ORDER BY r.quadra;


-- -------------------------------------------------------------
-- 7. Enable RLS
-- -------------------------------------------------------------

ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_reports  ENABLE ROW LEVEL SECURITY;


-- -------------------------------------------------------------
-- 8. RLS policies — rooms
-- Any authenticated user can read the rooms list.
-- No direct insert/update/delete by users (managed via trigger).
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "rooms_read_authenticated" ON rooms;
CREATE POLICY "rooms_read_authenticated"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);


-- -------------------------------------------------------------
-- 9. RLS policies — room_messages
--
-- NOTE: auth_id is the column on users that matches auth.uid().
--       users.id is the internal UUID used as foreign key elsewhere.
--       All auth checks use the subquery pattern:
--         (SELECT id FROM users WHERE auth_id = auth.uid())
-- -------------------------------------------------------------

-- Read: authenticated users can read messages in their own quadra room
DROP POLICY IF EXISTS "room_messages_read_own_quadra" ON room_messages;
CREATE POLICY "room_messages_read_own_quadra"
  ON room_messages FOR SELECT
  TO authenticated
  USING (
    room_id = (
      SELECT room_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Insert: non-anonymous, non-muted users can send to their own quadra room
-- is_anonymous lives on auth.users (Supabase built-in), not public.users
DROP POLICY IF EXISTS "room_messages_insert_own_quadra" ON room_messages;
CREATE POLICY "room_messages_insert_own_quadra"
  ON room_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- sender_id must match the authenticated user's internal id
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    -- must be sending to their own quadra room
    AND room_id = (SELECT room_id FROM users WHERE auth_id = auth.uid())
    -- anonymous mode users cannot send
    AND (SELECT is_anonymous FROM auth.users WHERE id = auth.uid()) IS NOT TRUE
    -- muted users cannot send
    AND (
      (SELECT room_muted_until FROM users WHERE auth_id = auth.uid()) IS NULL
      OR (SELECT room_muted_until FROM users WHERE auth_id = auth.uid()) < NOW()
    )
  );

-- Update (soft delete): sender can soft-delete own messages
-- Admins handled via service role key in dashboard — no admin RLS policy needed at this stage
DROP POLICY IF EXISTS "room_messages_update_own" ON room_messages;
CREATE POLICY "room_messages_update_own"
  ON room_messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    sender_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );


-- -------------------------------------------------------------
-- 10. RLS policies — room_reports
-- Any authenticated user can submit a report.
-- Users can read only their own submitted reports.
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "room_reports_insert" ON room_reports;
CREATE POLICY "room_reports_insert"
  ON room_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "room_reports_read_own" ON room_reports;
CREATE POLICY "room_reports_read_own"
  ON room_reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );


-- =============================================================
-- Post-migration verification queries (uncomment and run manually)
-- =============================================================

-- 1. Confirm four rooms exist
-- SELECT * FROM rooms ORDER BY quadra;

-- 2. Confirm member counts per quadra
-- SELECT r.quadra, COUNT(u.id) AS members
-- FROM rooms r
-- LEFT JOIN users u ON u.room_id = r.id
-- GROUP BY r.quadra ORDER BY r.quadra;

-- 3. Confirm users with a valid type but no room_id (should be 0)
-- SELECT COUNT(*) FROM users
-- WHERE type IS NOT NULL AND room_id IS NULL;

-- 4. Spot-check a known user
-- SELECT id, type, room_id FROM users WHERE type = 'SEI' LIMIT 5;
