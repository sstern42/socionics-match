-- Issue #866 (frontend phase prep): close an INSERT-time gap on type_source.
--
-- protect_sensitive_user_columns() (20260702160000) only fires BEFORE UPDATE,
-- matching the trigger it extended (20260623121000). But "Users: insert own
-- profile" (supabase/rls_reset.sql) has no column-level WITH CHECK beyond
-- auth_id ownership — so a signup could INSERT their own row with
-- type_source = 'onboarding_chat' directly via a crafted REST call, without
-- ever going through the chat. That's concretely exploitable once the
-- premium-discount coupon eligibility check (issue #866 Section 13:
-- type_source = 'onboarding_chat' AND is_premium() false) ships, since it'd
-- let any new signup self-grant coupon eligibility for free.
--
-- (The same INSERT gap exists for is_founding_member / plan_status /
-- stripe_* / referral_* / verified_by — those predate this issue and aren't
-- touched here; flagged separately as their own finding.)
--
-- Fix: extend the trigger to also fire BEFORE INSERT. On INSERT, any
-- type_source value other than 'unset' or 'self_reported' (i.e. the two
-- values a legitimate signup might reasonably supply) is reset to 'unset' —
-- the three privileged values ('onboarding_chat', 'paid_verified',
-- 'community_verified') can only ever be set by the SECURITY DEFINER
-- functions that run as service_role and are unaffected by this trigger
-- (current_user <> 'authenticated' short-circuits it).

CREATE OR REPLACE FUNCTION protect_sensitive_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.type_source NOT IN ('unset', 'self_reported') THEN
      NEW.type_source := 'unset';
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE'
  NEW.is_founding_member             := OLD.is_founding_member;
  NEW.plan_status                    := OLD.plan_status;
  NEW.stripe_customer_id             := OLD.stripe_customer_id;
  NEW.stripe_subscription_id         := OLD.stripe_subscription_id;
  NEW.premium_started_at             := OLD.premium_started_at;
  NEW.premium_current_period_end     := OLD.premium_current_period_end;
  NEW.referral_code                  := OLD.referral_code;
  NEW.referred_by_user_id            := OLD.referred_by_user_id;
  NEW.referral_premium_until         := OLD.referral_premium_until;
  NEW.referral_premium_days_granted  := OLD.referral_premium_days_granted;
  NEW.referral_count_qualified       := OLD.referral_count_qualified;
  NEW.type_source                    := OLD.type_source;

  NEW.profile_data := jsonb_set(
    COALESCE(NEW.profile_data, '{}'::jsonb),
    '{role}',
    COALESCE(OLD.profile_data->'role', 'null'::jsonb)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_protect_sensitive_columns ON users;
CREATE TRIGGER users_protect_sensitive_columns
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION protect_sensitive_user_columns();
