-- Server-side feed filtering (fixes #929 and #932).
--
-- Previously getFeedProfiles() fetched a page filtered only by type/purpose,
-- then removed blocked / swiped / hidden profiles *client-side*. Two bugs fell
-- out of that split:
--   #929 — the `total` count filtered only on type/purpose, so it overstated
--          how many profiles the user can actually see.
--   #932 — `hasMore` was derived from the raw (pre-filter) page size, so a
--          fetched page of 30 rows could render only a handful of cards while
--          `hasMore` stayed true, giving stretches of near-empty pages.
--
-- Both are fixed by doing the exclusion server-side so a page of N reflects N
-- visible profiles and the count is computed over the same predicate as the
-- list. `count(*) over()` rides on the page rows, so the count and the list
-- can never disagree.
--
-- The exclusion set is: self, null profile_data, profile_data->>'hidden',
-- any active block (either direction), and ANY prior swipe (either direction).
-- Excluding all swipes — not just left/passed swipes — matches the net set the
-- user already sees: the client seeds `swipedIdsRef` from every swipe and
-- filters right-swiped-but-unmatched profiles out of the deck, so the visible
-- result is unchanged; only `total`/`hasMore`/relation counts become accurate.
--
-- Relation logic stays in JS (src/data/relations.js): the caller passes the
-- already-derived list of compatible type codes as p_types (and the premium /
-- same-quadra narrowing is applied there too), so these functions never need
-- to know the socionics relation matrix. get_feed_type_counts returns per-type
-- counts under the same exclusions, which the client maps type -> relation to
-- build the relation-filter pill counts.
--
-- SECURITY DEFINER (to bypass RLS for the anti-joins against another user's
-- blocks/swipes and to read all candidate profiles), so the returned profile
-- object is an explicit column whitelist — never `to_jsonb(users)` — to avoid
-- leaking auth_id / email / billing columns. The caller is derived from
-- auth.uid() server-side; the p_* params carry no identity.

create or replace function get_feed_profiles(
  p_types   text[],
  p_purpose text[],
  p_limit   int,
  p_offset  int
)
returns table (profile jsonb, total_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id from users where auth_id = auth.uid()
  ),
  candidates as (
    select
      u.id, u.type, u.type_confidence, u.profile_data, u.location,
      u.relation_preferences, u.avatar_url, u.purpose, u.last_active,
      u.verified_by, u.is_founding_member, u.plan_status
    from users u
    cross join me
    where u.id <> me.id
      and u.profile_data is not null
      and u.type = any(p_types)
      and coalesce((u.profile_data->>'hidden')::boolean, false) = false
      and (p_purpose is null or cardinality(p_purpose) = 0 or u.purpose && p_purpose)
      and not exists (
        select 1 from swipes s
        where s.swiper_id = me.id and s.target_id = u.id
      )
      and not exists (
        select 1 from blocks b
        where b.lifted_at is null
          and (b.expires_at is null or b.expires_at > now())
          and (
            (b.blocker_id = me.id and b.blocked_id = u.id)
            or (b.blocked_id = me.id and b.blocker_id = u.id)
          )
      )
  )
  select
    jsonb_build_object(
      'id',                   c.id,
      'type',                 c.type,
      'type_confidence',      c.type_confidence,
      'profile_data',         c.profile_data,
      'location',             c.location,
      'relation_preferences', c.relation_preferences,
      'avatar_url',           c.avatar_url,
      'purpose',              c.purpose,
      'last_active',          c.last_active,
      'verified_by',          c.verified_by,
      'is_founding_member',   c.is_founding_member,
      'plan_status',          c.plan_status
    ) as profile,
    count(*) over() as total_count
  from candidates c
  order by c.last_active desc nulls last
  limit p_limit offset p_offset
$$;

-- Per-type available counts under the identical exclusion predicate. The client
-- maps each type to a relation (getRelation) to build the relation-pill counts,
-- so these stay consistent with get_feed_profiles' total by construction.
create or replace function get_feed_type_counts(
  p_types   text[],
  p_purpose text[]
)
returns table (type text, cnt bigint)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id from users where auth_id = auth.uid()
  )
  select u.type, count(*)::bigint as cnt
  from users u
  cross join me
  where u.id <> me.id
    and u.profile_data is not null
    and u.type = any(p_types)
    and coalesce((u.profile_data->>'hidden')::boolean, false) = false
    and (p_purpose is null or cardinality(p_purpose) = 0 or u.purpose && p_purpose)
    and not exists (
      select 1 from swipes s
      where s.swiper_id = me.id and s.target_id = u.id
    )
    and not exists (
      select 1 from blocks b
      where b.lifted_at is null
        and (b.expires_at is null or b.expires_at > now())
        and (
          (b.blocker_id = me.id and b.blocked_id = u.id)
          or (b.blocked_id = me.id and b.blocker_id = u.id)
        )
    )
  group by u.type
$$;

grant execute on function get_feed_profiles(text[], text[], int, int) to authenticated;
grant execute on function get_feed_type_counts(text[], text[]) to authenticated;
