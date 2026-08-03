-- Add reply threading to room_messages
ALTER TABLE room_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES room_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_room_messages_reply_to
  ON room_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
