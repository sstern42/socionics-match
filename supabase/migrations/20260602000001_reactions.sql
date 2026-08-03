-- Room message reactions
CREATE TABLE IF NOT EXISTS room_message_reactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  UUID NOT NULL REFERENCES room_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (char_length(emoji) <= 8),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON room_message_reactions(message_id);

-- Full replica identity so DELETE payloads carry all columns for Realtime
ALTER TABLE room_message_reactions REPLICA IDENTITY FULL;

ALTER TABLE room_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_select" ON room_message_reactions;
DROP POLICY IF EXISTS "reactions_insert" ON room_message_reactions;
DROP POLICY IF EXISTS "reactions_delete" ON room_message_reactions;

-- Anyone authenticated can read reactions
CREATE POLICY "reactions_select" ON room_message_reactions
  FOR SELECT TO authenticated USING (true);

-- Can only insert as yourself
CREATE POLICY "reactions_insert" ON room_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_my_user_id());

-- Can only delete your own reactions
CREATE POLICY "reactions_delete" ON room_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = get_my_user_id());
