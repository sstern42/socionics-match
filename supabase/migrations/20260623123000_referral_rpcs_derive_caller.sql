-- Security fix: attribute_referral() and grant_referral_reward() both take
-- the referee's user ID as a plain parameter and never verify the caller
-- IS that referee. Since referrals.referee_id is UNIQUE, an attacker who
-- knows a victim's user ID (enumerable via public leaderboard/profile
-- pages) could call attribute_referral(ATTACKER_CODE, VICTIM_ID) then
-- grant_referral_reward(VICTIM_ID) directly, permanently consuming the
-- victim's one-time referee slot and crediting the attacker with free
-- premium days + referral count, without the victim's knowledge.
--
-- Fixed by deriving the referee from auth.uid() server-side and ignoring
-- the caller-supplied ID. The p_referee_id parameter is kept in both
-- signatures (now unused) so existing call sites in src/lib/referral.js
-- need no changes.

create or replace function attribute_referral(p_code text, p_referee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_caller_id uuid;
begin
  if p_code is null then
    return;
  end if;

  select id into v_caller_id from users where auth_id = auth.uid();
  if v_caller_id is null then
    return;
  end if;

  select id into v_referrer_id from users where referral_code = p_code;

  -- No such code, or the code belongs to the caller themselves.
  if v_referrer_id is null or v_referrer_id = v_caller_id then
    return;
  end if;

  insert into referrals (referrer_id, referee_id)
  values (v_referrer_id, v_caller_id)
  on conflict (referee_id) do nothing;
end;
$$;


create or replace function grant_referral_reward(p_referee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_referral record;
  v_referrer_premium boolean;
  v_referrer_days_granted int;
  v_reward_days constant int := 30;
  v_cap constant int := 180;
  v_grantable_days int;
begin
  select id into v_caller_id from users where auth_id = auth.uid();
  if v_caller_id is null then
    return;
  end if;

  select * into v_referral from referrals
    where referee_id = v_caller_id and status = 'pending';

  if v_referral is null then
    return; -- no pending referral for this caller
  end if;

  -- Referee reward: 7-day trial, regardless of referrer's status
  update users
    set referral_premium_until = greatest(
          coalesce(referral_premium_until, now()), now()
        ) + interval '7 days'
    where id = v_caller_id;

  -- Referrer reward: only meaningful if referrer isn't already premium via
  -- a real plan. Deliberately not is_premium(), which also returns true
  -- while a referral-earned window from a previous reward is still active.
  select (is_founding_member or plan_status in ('active', 'past_due')),
         referral_premium_days_granted
    into v_referrer_premium, v_referrer_days_granted
    from users where id = v_referral.referrer_id;

  v_grantable_days := least(v_reward_days, v_cap - v_referrer_days_granted);

  if not v_referrer_premium and v_grantable_days > 0 then
    update users
      set referral_premium_until = greatest(
            coalesce(referral_premium_until, now()), now()
          ) + (v_grantable_days || ' days')::interval,
          referral_premium_days_granted = referral_premium_days_granted + v_grantable_days
      where id = v_referral.referrer_id;
  end if;

  -- Badge/recognition count always increments, premium or not
  update users
    set referral_count_qualified = referral_count_qualified + 1
    where id = v_referral.referrer_id;

  update referrals
    set status = 'qualified', qualified_at = now(), reward_days_granted = v_grantable_days
    where id = v_referral.id;
end;
$$;
