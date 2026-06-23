-- Security fix: the "Users: update own profile" RLS policy
-- (supabase/rls_reset.sql) only validates row ownership via USING, with no
-- WITH CHECK. Postgres reuses USING as the implicit check when none is
-- given, so any authenticated user could PATCH their own row directly via
-- REST to set profile_data->>'role' = 'founder' (the admin gate), or flip
-- is_founding_member / plan_status / stripe_* to grant themselves premium.
--
-- This adds a BEFORE UPDATE trigger that pins those columns back to their
-- prior value whenever the update comes from a direct end-user session.
--
-- Relies on a Postgres SECURITY DEFINER semantic: a function executes with
-- current_user set to the function's *owner* role, not the calling
-- session's role, even though auth.uid()/auth.role() (JWT claim GUCs)
-- still reflect the original caller. So current_user = 'authenticated'
-- reliably identifies a direct end-user REST/RPC call, while internal
-- SECURITY DEFINER functions (grant_referral_reward, attribute_referral,
-- generate_referral_code) and the Stripe webhook / SQL editor (which use
-- the service role / postgres role) pass straight through unaffected.

create or replace function protect_sensitive_user_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

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

  new.profile_data := jsonb_set(
    coalesce(new.profile_data, '{}'::jsonb),
    '{role}',
    coalesce(old.profile_data->'role', 'null'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists users_protect_sensitive_columns on users;
create trigger users_protect_sensitive_columns
  before update on users
  for each row
  execute function protect_sensitive_user_columns();
