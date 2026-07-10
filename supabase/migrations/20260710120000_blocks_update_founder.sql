-- Bug fix: admin "Unblock" in the dashboard silently did nothing.
--
-- The blocks table only had a FOR ALL policy scoped to blocker_id
-- ownership ("Users can manage their own blocks", supabase/blocks.sql).
-- Founders can *see* every block via the get_admin_stats() SECURITY
-- DEFINER RPC, but liftBlock() (src/lib/blocks.js) performs a direct
-- client UPDATE that is still subject to RLS. When a founder lifts a
-- block they don't own, RLS filters the UPDATE to zero matching rows —
-- no error is raised, so the call "succeeds" while nothing changes and
-- the block reappears after reload.
--
-- Mirror the founder policies already added for user_reports and
-- board_reports so founders can lift any block. The protect_block_columns
-- trigger (20260623122000) still pins every column except lifted_at back
-- to its prior value on direct authenticated sessions, so this grant
-- lets founders lift a block without being able to tamper with any other
-- column.

DROP POLICY IF EXISTS "blocks_update_founder" ON blocks;
CREATE POLICY "blocks_update_founder"
  ON blocks FOR UPDATE
  TO authenticated
  USING (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  )
  WITH CHECK (
    (SELECT profile_data->>'role' FROM users WHERE auth_id = auth.uid()) = 'founder'
  );
