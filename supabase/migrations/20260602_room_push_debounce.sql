-- Add debounce tracking for room push notifications (5-minute window per device)
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS last_room_push_at TIMESTAMPTZ;
