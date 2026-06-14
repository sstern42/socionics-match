-- Set dev account (spencer.stern+socion@gmail.com) to free tier and hide from feeds
UPDATE public.users
SET
  is_founding_member = FALSE,
  plan_status = 'free',
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  premium_started_at = NULL,
  premium_current_period_end = NULL,
  profile_data = profile_data || '{"hidden": true}'::jsonb
WHERE auth_id = (
  SELECT id FROM auth.users WHERE email = 'spencer.stern+socion@gmail.com'
);
