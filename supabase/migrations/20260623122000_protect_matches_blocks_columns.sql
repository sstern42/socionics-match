-- Security fix: two more RLS UPDATE policies validate row
-- participancy/ownership only (via USING, reused as the implicit check
-- with no WITH CHECK), not which columns change.
--
-- (a) "Matches: update feedback" (supabase/rls_reset.sql) lets either
--     participant PATCH the *other* party's feedback_a/feedback_b column
--     directly via REST, forging their counterpart's rating/comment. The
--     client (src/pages/Feedback.jsx) only ever writes its own side, but
--     RLS doesn't enforce that.
-- (b) "Users can manage their own blocks" (supabase/blocks.sql) is a FOR
--     ALL policy scoped only to blocker_id ownership. The client
--     (src/lib/blocks.js liftBlock) only ever updates lifted_at, but a
--     blocker can PATCH blocked_id/type/reason/notes/expires_at on their
--     own block row directly via REST.
--
-- Both fixed with a BEFORE UPDATE trigger that pins everything but the
-- legitimately-writable column(s) back to the prior value, on direct
-- end-user sessions only (current_user = 'authenticated' — see
-- 20260623121000 for why this reliably distinguishes a direct REST/RPC
-- call from an internal SECURITY DEFINER function call, which the mutual
-- swipe trigger and revive_match() both are).

create or replace function protect_match_feedback_columns()
returns trigger
language plpgsql
as $$
declare
  v_caller_id uuid;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- Lock everything except feedback_a/feedback_b — relation_type, purpose,
  -- and unmatch state are only ever meant to change via INSERT or the
  -- SECURITY DEFINER RPCs (revive_match, the unmatch RPC), never a direct
  -- client PATCH.
  new.user_a_id      := old.user_a_id;
  new.user_b_id      := old.user_b_id;
  new.relation_type  := old.relation_type;
  new.purpose        := old.purpose;
  new.unmatched_at   := old.unmatched_at;
  new.unmatched_by   := old.unmatched_by;
  new.created_at     := old.created_at;

  select id into v_caller_id from users where auth_id = auth.uid();

  if v_caller_id = old.user_a_id then
    new.feedback_b := old.feedback_b;
  elsif v_caller_id = old.user_b_id then
    new.feedback_a := old.feedback_a;
  else
    new.feedback_a := old.feedback_a;
    new.feedback_b := old.feedback_b;
  end if;

  return new;
end;
$$;

drop trigger if exists matches_protect_feedback_columns on matches;
create trigger matches_protect_feedback_columns
  before update on matches
  for each row
  execute function protect_match_feedback_columns();


create or replace function protect_block_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- Lock everything except lifted_at — the only column the client ever
  -- legitimately updates directly (liftBlock in src/lib/blocks.js).
  new.blocker_id  := old.blocker_id;
  new.blocked_id  := old.blocked_id;
  new.type        := old.type;
  new.reason      := old.reason;
  new.notes       := old.notes;
  new.expires_at  := old.expires_at;
  new.created_at  := old.created_at;

  return new;
end;
$$;

drop trigger if exists blocks_protect_columns on blocks;
create trigger blocks_protect_columns
  before update on blocks
  for each row
  execute function protect_block_columns();
