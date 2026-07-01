-- Typing checkout clicks
-- Logs when a signed-in user clicks "Book" on a typist's paid tier
-- (an external Stripe Payment Link). Gives admins a private, queryable
-- record of purchase *intent*, independent of Stripe's own
-- payment-received notifications. Consumed by discord-notify's
-- typing-checkout-clicked event, routed to the private typing channel.
-- Run in Supabase SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS typing_checkout_clicks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  typist_slug TEXT        NOT NULL,
  tier_key    TEXT        NOT NULL,
  tier_price  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_typing_checkout_clicks_user_id
  ON typing_checkout_clicks(user_id);

ALTER TABLE typing_checkout_clicks ENABLE ROW LEVEL SECURITY;

-- User can log their own checkout clicks. No SELECT policy for regular
-- users — this is admin/Discord-only visibility; service_role (used by
-- discord-notify) bypasses RLS.
DROP POLICY IF EXISTS "insert own typing checkout clicks" ON typing_checkout_clicks;
CREATE POLICY "insert own typing checkout clicks" ON typing_checkout_clicks
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
