-- Bug fix (follow-up to 20260710120000): make the admin "Unblock" action
-- actually lift the block.
--
-- 20260710120000 added a founder UPDATE policy on blocks so founders
-- could lift any block via the direct client UPDATE in liftBlock(). In
-- practice the button still did nothing: the lift is a client PATCH that
-- has to satisfy the founder RLS policy *and* survive the
-- protect_block_columns BEFORE UPDATE trigger (20260623122000) *and*
-- PostgREST's update handling — a fragile stack for a privileged action.
--
-- Match the pattern get_admin_stats() already uses reliably: do the work
-- in a SECURITY DEFINER function that performs its own founder check and
-- runs as the function owner, so it bypasses RLS and the
-- current_user='authenticated' trigger guard entirely. The admin client
-- calls this RPC instead of PATCHing the blocks row directly. The
-- ordinary user path (lifting your own cooloff in Conversation.jsx) keeps
-- using the direct UPDATE under the existing blocker-owned policy.

create or replace function admin_lift_block(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from users
    where auth_id = auth.uid()
      and profile_data->>'role' = 'founder'
  ) then
    raise exception 'Forbidden';
  end if;

  update blocks
  set lifted_at = now()
  where id = p_block_id;
end;
$$;
