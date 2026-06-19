-- Allow founders to update the stats row (announcement / site banner editing from Admin page).
-- stats has RLS enabled with only a public SELECT policy, so admin UPDATE calls from the
-- client were silently rejected and never persisted.
DROP POLICY IF EXISTS "stats_update_founder" ON stats;
CREATE POLICY "stats_update_founder"
  ON stats FOR UPDATE
  TO authenticated
  USING (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  )
  WITH CHECK (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  );
