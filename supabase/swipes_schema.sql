-- =============================================================
-- SOCION — Swipe Mode Schema
-- Corrected for actual codebase:
--   - table: users (not profiles)
--   - column: type (not socionics_type)
--   - connections table: matches (user_a_id, user_b_id)
--   - RLS via auth_id = auth.uid() subquery
--   - relation_type stored on swipe row (no DB relation lookup)
--   - no notifications table (push handled by edge functions)
-- Run in Supabase SQL editor
-- =============================================================


-- -------------------------------------------------------------
-- 0. MATCHES UNIQUE CONSTRAINT
-- Prevents duplicate connections between the same pair.
-- Uses an expression index so it works regardless of which user
-- is user_a vs user_b — normalises the pair before comparing.
-- The trigger inserts with least/greatest so this index is always hit.
-- -------------------------------------------------------------

create unique index if not exists matches_pair_unique
  on matches (
    least(user_a_id::text,    user_b_id::text),
    greatest(user_a_id::text, user_b_id::text)
  );


-- -------------------------------------------------------------
-- 1. SWIPES TABLE
-- -------------------------------------------------------------

create table if not exists swipes (
  id            uuid        default gen_random_uuid() primary key,
  swiper_id     uuid        not null references users(id) on delete cascade,
  target_id     uuid        not null references users(id) on delete cascade,
  direction     text        not null check (direction in ('right', 'left')),
  -- relation from swiper's perspective (e.g. 'DUAL', 'MIRROR')
  -- client passes this in; mirrors getRelation(swiperType, targetType)
  relation_type text,
  created_at    timestamptz default now(),

  constraint swipes_pair_unique unique (swiper_id, target_id),
  constraint swipes_no_self     check  (swiper_id <> target_id)
);

create index if not exists swipes_swiper_idx on swipes (swiper_id);
create index if not exists swipes_target_idx on swipes (target_id);
-- for mutual match lookup in trigger
create index if not exists swipes_mutual_idx on swipes (target_id, swiper_id, direction);


-- -------------------------------------------------------------
-- 2. RLS POLICIES
-- Uses same auth pattern as rest of app:
--   users.auth_id = auth.uid()
-- -------------------------------------------------------------

alter table swipes enable row level security;

-- read own swipes only
drop policy if exists "swipes_select_own" on swipes;
create policy "swipes_select_own"
  on swipes for select
  using (
    swiper_id in (select id from users where auth_id = auth.uid())
  );

-- insert own swipes only
drop policy if exists "swipes_insert_own" on swipes;
create policy "swipes_insert_own"
  on swipes for insert
  with check (
    swiper_id in (select id from users where auth_id = auth.uid())
  );

-- no client-side update or delete
drop policy if exists "swipes_no_update" on swipes;
create policy "swipes_no_update"
  on swipes for update
  using (false);

drop policy if exists "swipes_no_delete" on swipes;
create policy "swipes_no_delete"
  on swipes for delete
  using (false);


-- -------------------------------------------------------------
-- 3. MUTUAL MATCH TRIGGER FUNCTION
-- Fires after every insert on swipes.
-- On a right-swipe: checks for a reverse right-swipe.
-- If mutual → inserts into matches (same least/greatest pattern
-- as existing duplicate prevention) with on conflict do nothing.
-- No notifications insert — push is handled by the existing
-- send-push edge function via the messages INSERT webhook.
-- -------------------------------------------------------------

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

  -- ── mutual match confirmed ──────────────────────────────────
  -- Use least/greatest to prevent duplicate pairs (same pattern
  -- as existing matches constraint in the codebase)
  insert into matches (user_a_id, user_b_id, relation_type, purpose, created_at)
  values (
    least(NEW.swiper_id,    NEW.target_id),
    greatest(NEW.swiper_id, NEW.target_id),
    coalesce(NEW.relation_type, 'unknown'),
    'dating',   -- swipe mode is dating-first; extend if needed
    now()
  )
  on conflict do nothing;   -- idempotent if trigger fires twice

  return NEW;
end;
$$;


-- -------------------------------------------------------------
-- 4. ATTACH TRIGGER
-- -------------------------------------------------------------

drop trigger if exists on_swipe_inserted on swipes;

create trigger on_swipe_inserted
  after insert on swipes
  for each row
  execute function handle_mutual_swipe_match();


-- -------------------------------------------------------------
-- 5. FEED FILTER VIEW
-- Returns the IDs of profiles this user has already swiped.
-- Use in getFeedProfiles to exclude them from the deck:
--
--   const { data } = await supabase
--     .from('already_swiped')
--     .select('swiped_profile_id')
--
--   .not('id', 'in', `(${ids.join(',')})`)
--
-- RLS on the view inherits swipes RLS — only returns own swipes.
-- -------------------------------------------------------------

create or replace view already_swiped as
  select
    swiper_id       as user_id,
    target_id       as swiped_profile_id
  from swipes
  where swiper_id in (
    select id from users where auth_id = auth.uid()
  );


-- =============================================================
-- DONE. Verify with:
--   select * from swipes limit 5;
--   select * from already_swiped;
--   select * from matches order by created_at desc limit 5;
-- =============================================================
