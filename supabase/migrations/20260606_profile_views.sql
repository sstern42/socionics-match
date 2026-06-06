-- Profile views
-- Logs every visit to a user profile.
-- Deduplication (1-hour window) handled in the RPC, not the table,
-- so raw event data is preserved for future analytics.

CREATE TABLE IF NOT EXISTS profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id
  ON profile_views(viewed_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id
  ON profile_views(viewer_id);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Viewer can log their own view events
DROP POLICY IF EXISTS "insert own views" ON profile_views;
CREATE POLICY "insert own views" ON profile_views
  FOR INSERT WITH CHECK (
    viewer_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Profile owner can read views of their own profile
DROP POLICY IF EXISTS "read own profile views" ON profile_views;
CREATE POLICY "read own profile views" ON profile_views
  FOR SELECT USING (
    viewed_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- -----------------------------------------------------------------------
-- RPC: log_profile_view
-- Skips self-views and deduplicates within a 1-hour window per viewer.
-- SECURITY DEFINER so no RLS conflicts on insert.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_profile_view(p_viewer UUID, p_viewed UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_viewer = p_viewed THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM profile_views
    WHERE viewer_id = p_viewer
      AND viewed_id  = p_viewed
      AND viewed_at  > NOW() - INTERVAL '1 hour'
  ) THEN RETURN; END IF;
  INSERT INTO profile_views (viewer_id, viewed_id) VALUES (p_viewer, p_viewed);
END;
$$;
