-- Security fix: can_add_connection() did an unlocked SELECT count(*) < 3
-- check. It's called independently from the "Matches: create" RLS policy,
-- the mutual-swipe trigger, and revive_match() — two near-simultaneous
-- match events for the same user at 2 connections could both read the
-- same stale count and pass, exceeding the free-tier cap by 1.
--
-- Fixed by taking a row lock on the user's own row first (SELECT ... FOR
-- UPDATE). A second concurrent call for the same user now blocks until
-- the first transaction commits, then re-counts against a fresh snapshot.
-- If two transactions ever lock two different users' rows in opposite
-- order (e.g. both sides of a mutual match), Postgres's deadlock detector
-- aborts one rather than corrupting data — an acceptable rare-failure
-- tradeoff over a silent cap bypass.

create or replace function can_add_connection(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  perform 1 from users where id = p_user_id for update;

  if is_premium(p_user_id) then
    return true;
  end if;

  select count(*) into v_count
  from matches
  where (user_a_id = p_user_id or user_b_id = p_user_id)
    and unmatched_at is null;

  return v_count < 3;
end;
$$;
