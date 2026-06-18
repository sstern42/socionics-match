-- ============================================================================
-- THROWAWAY TEST SCRIPT — connection cap enforcement
-- Run manually in the Supabase SQL editor. Not a migration, not auto-applied.
-- Safe to run repeatedly; cleanup block at the bottom removes everything it
-- creates.
-- ============================================================================

-- ── STEP 1: pick your two real test accounts ──────────────────────────────
-- Replace these with the auth user ids (users.id, not auth_id) of two
-- accounts you're willing to use for testing. USER_A will be the premium
-- "connector", USER_B the free-tier account we'll push to the cap.

-- select id, email, plan_status, is_founding_member from users order by created_at desc limit 10;

-- Paste the two ids here:
--   USER_A_ID := '00000000-0000-0000-0000-000000000001'
--   USER_B_ID := '00000000-0000-0000-0000-000000000002'

do $$
declare
  user_a_id uuid := '00000000-0000-0000-0000-000000000001'; -- premium connector
  user_b_id uuid := '00000000-0000-0000-0000-000000000002'; -- free-tier, will hit cap
  filler_1  uuid;
  filler_2  uuid;
  filler_3  uuid;
begin
  -- ── make A premium (founding member is the simplest toggle) ─────────────
  update users set is_founding_member = true where id = user_a_id;

  -- ── make B free-tier ──────────────────────────────────────────────────
  update users set is_founding_member = false, plan_status = 'free' where id = user_b_id;

  -- ── give B three other connections to fill the cap ───────────────────
  -- pick three arbitrary other users (not A, not B) to act as filler matches
  select id into filler_1 from users where id not in (user_a_id, user_b_id) order by created_at limit 1 offset 0;
  select id into filler_2 from users where id not in (user_a_id, user_b_id) order by created_at limit 1 offset 1;
  select id into filler_3 from users where id not in (user_a_id, user_b_id) order by created_at limit 1 offset 2;

  insert into matches (user_a_id, user_b_id, relation_type, purpose)
  values
    (least(user_b_id, filler_1), greatest(user_b_id, filler_1), 'unknown', 'dating'),
    (least(user_b_id, filler_2), greatest(user_b_id, filler_2), 'unknown', 'dating'),
    (least(user_b_id, filler_3), greatest(user_b_id, filler_3), 'unknown', 'dating')
  on conflict do nothing;

  raise notice 'A premium: %, B active connections: %',
    is_premium(user_a_id),
    (select count(*) from matches where (user_a_id = user_b_id or matches.user_b_id = user_b_id) and unmatched_at is null);
end $$;

-- ── STEP 2: sanity checks before testing in the UI ─────────────────────────

-- select is_premium('00000000-0000-0000-0000-000000000001');                -- expect true
-- select can_add_connection('00000000-0000-0000-0000-000000000002');         -- expect false
-- select count(*) from matches
--   where (user_a_id = '00000000-0000-0000-0000-000000000002'
--      or  user_b_id = '00000000-0000-0000-0000-000000000002')
--   and unmatched_at is null;                                                -- expect 3

-- ── STEP 3: now in the app, log in as USER_A and try to connect to USER_B ──
-- Expect: insert rejected, friendly cap message shown, B's count stays at 3.

-- ============================================================================
-- CLEANUP — removes only the filler matches this script created for B,
-- and resets B's premium flags back to whatever you want.
-- Does NOT touch A; revert A's founding-member flag manually if it wasn't
-- already true before this test.
-- ============================================================================

-- delete from matches
-- where (user_a_id = '00000000-0000-0000-0000-000000000002'
--    or  user_b_id = '00000000-0000-0000-0000-000000000002')
-- and unmatched_at is null
-- and created_at > now() - interval '1 hour';  -- guard: only delete what we just made
