-- Enforce the free-tier 3-connection cap on BOTH parties of a match, not just
-- the initiator. Previously can_add_connection() existed but was never
-- invoked anywhere, so a premium user (unlimited connections) could connect
-- to a free-tier user who had already used their 3 connections, silently
-- pushing them over the cap.
--
-- Two insertion paths create rows in `matches`:
--   1. Direct insert from the client (src/lib/feed.js createMatch), gated by
--      the "Matches: create" RLS policy.
--   2. The mutual-swipe trigger (handle_mutual_swipe_match in
--      supabase/swipes_schema.sql), which runs SECURITY DEFINER and bypasses
--      RLS entirely.
--
-- Both now check can_add_connection() for user_a_id AND user_b_id.

-- ── 1. RLS policy: require both parties to have room for a new connection ──

drop policy if exists "Matches: create" on matches;

create policy "Matches: create"
  on matches for insert
  with check (
    user_a_id in (select id from users where auth_id = auth.uid())
    and can_add_connection(user_a_id)
    and can_add_connection(user_b_id)
  );

-- ── 2. Mutual-swipe trigger: skip creating the match if either side is capped ──

create or replace function handle_mutual_swipe_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- only act on right-swipes
  if NEW.direction <> 'right' then
    return NEW;
  end if;

  -- check for reverse right-swipe
  if not exists (
    select 1 from swipes
    where swiper_id = NEW.target_id
      and target_id = NEW.swiper_id
      and direction = 'right'
  ) then
    return NEW;   -- not mutual yet
  end if;

  -- respect the free-tier connection cap on both sides before matching
  if not can_add_connection(NEW.swiper_id) or not can_add_connection(NEW.target_id) then
    return NEW;
  end if;

  -- ── mutual match confirmed ──────────────────────────────────
  insert into matches (user_a_id, user_b_id, relation_type, purpose, created_at)
  values (
    least(NEW.swiper_id,    NEW.target_id),
    greatest(NEW.swiper_id, NEW.target_id),
    coalesce(NEW.relation_type, 'unknown'),
    'dating',
    now()
  )
  on conflict do nothing;

  return NEW;
end;
$$;
