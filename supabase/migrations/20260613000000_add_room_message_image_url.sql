-- Room messages: add optional image_url column
-- Idempotent — safe to run more than once

ALTER TABLE room_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;
