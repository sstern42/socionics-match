-- Security fix: chat-socionics's rate limit check did a separate
-- SELECT count(*) then UPSERT count+1, both called per inbound chat message
-- from the edge function. Two messages sent in quick succession (e.g. from
-- two browser tabs, or a deliberate burst) could both read the same stale
-- count and pass the FREE_DAILY_LIMIT check before either write lands,
-- letting a free user exceed the daily cap.
--
-- Fixed with the same row-lock pattern as can_add_connection (see
-- 20260623125000): lock the user's count row first (SELECT ... FOR UPDATE),
-- then check-and-increment against a fresh snapshot. A second concurrent
-- call for the same user+date blocks until the first commits. The limit
-- check happens before incrementing, so a rejected (over-limit) call leaves
-- the stored count untouched instead of incrementing it anyway.
--
-- p_limit is null for premium users (no cap, but still counted for
-- analytics) and FREE_DAILY_LIMIT for free users.
--
-- This RPC is only ever called server-side (chat-socionics uses the service
-- role client, after already authenticating the end user's own JWT and
-- resolving their users.id) — never directly from the browser — so unlike
-- the referral/profile-view RPCs fixed earlier, there's no caller identity
-- to derive here. It's locked down to service_role only instead.

create or replace function increment_ai_message_count(p_user_id uuid, p_date date, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into ai_message_counts (user_id, date, count)
  values (p_user_id, p_date, 0)
  on conflict (user_id, date) do nothing;

  select count into v_count
  from ai_message_counts
  where user_id = p_user_id and date = p_date
  for update;

  if p_limit is not null and v_count >= p_limit then
    return false;
  end if;

  update ai_message_counts
    set count = count + 1
  where user_id = p_user_id and date = p_date;

  return true;
end;
$$;

revoke execute on function increment_ai_message_count(uuid, date, int) from authenticated, anon, public;
grant execute on function increment_ai_message_count(uuid, date, int) to service_role;
