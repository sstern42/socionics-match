-- Migration: 20261018120000_harden_user_columns_and_admin_verify.sql
--
-- From the 18 October 2026 security audit. Three things:
--
-- 1. Five more users columns are pinned on UPDATE. protect_sensitive_user_columns()
--    (last defined in 20260930130000) pins the premium, referral, type_source and
--    consent columns and profile_data.role, but not:
--      verified_by       any member could PATCH their own row with
--                        verified_by = 'Spencer' and get the verified badge
--      room_muted_until  the only enforcement of a room mute (20260619170000);
--                        a muted member could clear it with one PATCH
--      room_id           lets a member read and post in another quadra's room.
--                        Pinned only while type is unchanged: on a type change
--                        users_assign_quadra_room (which fires first, by name
--                        order) has already set the right room, so that value
--                        is kept
--      auth_id, created_at  never legitimately change
--    20260702170000 noted verified_by as a known gap. last_active is not pinned:
--    AuthContext.jsx updates it from the client.
--
-- 2. admin_set_verified_type(): Admin.jsx granted and revoked verified status
--    with a direct UPDATE on another member's row. The only UPDATE policy on
--    users is "update own profile", so that PATCH matched zero rows and the
--    button did nothing. Same pattern as admin_lift_block (20260710130000):
--    a SECURITY DEFINER RPC that does its own founder check.
--
-- 3. search_path set on the SECURITY DEFINER functions that lacked it, and on
--    the three column-protection triggers, via ALTER FUNCTION (no body change).
--
-- 4. account_deletions records the Stripe ids so a subscription can be found
--    after the users row is gone.

-- ── 1. Column protection ─────────────────────────────────────────────────────

create or replace function protect_sensitive_user_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    if new.type_source not in ('unset', 'self_reported') then
      new.type_source := 'unset';
    end if;
    new.marketing_opt_in         := null;
    new.marketing_opt_in_at      := null;
    new.marketing_consent_source := null;
    new.verified_by              := null;
    new.room_muted_until         := null;
    return new;
  end if;

  -- TG_OP = 'UPDATE'
  new.is_founding_member             := old.is_founding_member;
  new.plan_status                    := old.plan_status;
  new.stripe_customer_id             := old.stripe_customer_id;
  new.stripe_subscription_id         := old.stripe_subscription_id;
  new.premium_started_at             := old.premium_started_at;
  new.premium_current_period_end     := old.premium_current_period_end;
  new.referral_code                  := old.referral_code;
  new.referred_by_user_id            := old.referred_by_user_id;
  new.referral_premium_until         := old.referral_premium_until;
  new.referral_premium_days_granted  := old.referral_premium_days_granted;
  new.referral_count_qualified       := old.referral_count_qualified;
  new.type_source                    := old.type_source;
  new.marketing_opt_in               := old.marketing_opt_in;
  new.marketing_opt_in_at            := old.marketing_opt_in_at;
  new.marketing_consent_source       := old.marketing_consent_source;
  new.email_notifications            := old.email_notifications;
  new.email_notifications_updated_at := old.email_notifications_updated_at;
  new.verified_by                    := old.verified_by;
  new.room_muted_until               := old.room_muted_until;
  new.auth_id                        := old.auth_id;
  new.created_at                     := old.created_at;
  if new.type is not distinct from old.type then
    new.room_id := old.room_id;
  end if;

  new.profile_data := jsonb_set(
    coalesce(new.profile_data, '{}'::jsonb),
    '{role}',
    coalesce(old.profile_data->'role', 'null'::jsonb)
  );

  return new;
end;
$$;

-- ── 2. Admin verification RPC ────────────────────────────────────────────────

create or replace function admin_set_verified_type(
  p_user_id     uuid,
  p_verified_by text,
  p_type        text
)
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

  if p_type is not null and p_type not in (
    'ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI',
    'SEE','ILI','LIE','ESI','LSE','EII','IEE','SLI'
  ) then
    raise exception 'Unknown type %', p_type;
  end if;

  update users
  set verified_by = nullif(trim(p_verified_by), ''),
      type        = coalesce(p_type, type),
      type_source = case when nullif(trim(p_verified_by), '') is not null
                         then 'paid_verified' else 'self_reported' end
  where id = p_user_id;

  if not found then
    raise exception 'No such user';
  end if;
end;
$$;

revoke all on function admin_set_verified_type(uuid, text, text) from public, anon;
grant execute on function admin_set_verified_type(uuid, text, text) to authenticated;

-- ── 3. search_path ───────────────────────────────────────────────────────────

alter function unarchive_on_incoming_message()            set search_path = public;
alter function log_profile_view(uuid, uuid)                set search_path = public;
alter function get_user_relation_stats(uuid)               set search_path = public;
alter function get_global_relation_averages()              set search_path = public;
alter function protect_match_feedback_columns()            set search_path = public;
alter function protect_block_columns()                     set search_path = public;

-- ── 4. Stripe ids on the deletion log ────────────────────────────────────────

alter table account_deletions
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

create or replace function log_account_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
begin
  v_source := case
    when auth.uid() is not null and auth.uid() = old.auth_id then 'self_authenticated'
    else 'service_role_or_admin'
  end;

  insert into account_deletions (
    deleted_user_id, deleted_auth_id, account_created_at,
    type, purpose, plan_status, is_founding_member, deletion_source,
    stripe_customer_id, stripe_subscription_id
  ) values (
    old.id, old.auth_id, old.created_at,
    old.type, old.purpose, old.plan_status, old.is_founding_member, v_source,
    old.stripe_customer_id, old.stripe_subscription_id
  );

  return old;
end;
$$;
