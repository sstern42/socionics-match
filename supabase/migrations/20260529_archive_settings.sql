-- user_match_settings: per-user match preferences (archive, mute, pin in future)
-- Absence of a row = default state. Archive = row exists. Unarchive = delete row.

CREATE TABLE IF NOT EXISTS user_match_settings (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, match_id)
);

-- REPLICA IDENTITY FULL required so DELETE events include old row data in realtime
ALTER TABLE user_match_settings REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_ums_user_id ON user_match_settings(user_id);

ALTER TABLE user_match_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own match settings" ON user_match_settings;
CREATE POLICY "Users manage own match settings" ON user_match_settings
  FOR ALL
  USING  ((SELECT id FROM users WHERE auth_id = auth.uid()) = user_id)
  WITH CHECK ((SELECT id FROM users WHERE auth_id = auth.uid()) = user_id);

-- Auto-unarchive trigger: when an incoming message arrives, delete the
-- recipient's archive row for that match so it returns to the active list.

CREATE OR REPLACE FUNCTION unarchive_on_incoming_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id UUID;
BEGIN
  -- Recipient is whichever side of the match is NOT the sender
  SELECT CASE
    WHEN user_a_id = NEW.sender_id THEN user_b_id
    ELSE user_a_id
  END INTO v_recipient_id
  FROM matches
  WHERE id = NEW.match_id;

  -- Remove archive row if it exists for the recipient
  DELETE FROM user_match_settings
  WHERE user_id = v_recipient_id
    AND match_id = NEW.match_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_auto_unarchive ON messages;
CREATE TRIGGER messages_auto_unarchive
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION unarchive_on_incoming_message();
