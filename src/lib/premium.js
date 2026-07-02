// premium.js — client-side premium status helper
//
// Single source of truth for premium status on the client. Mirrors the SQL
// is_premium() function from the premium migration:
//
//   SELECT is_founding_member OR plan_status IN ('active', 'past_due')
//     OR (referral_premium_until IS NOT NULL AND referral_premium_until > NOW())
//
// IMPORTANT: this is for UX gating only. The real enforcement lives in the
// database (RLS policies and can_add_connection / is_premium SECURITY DEFINER
// functions). Never rely on this alone to protect a premium feature.
//
// Safe before the migration runs: missing columns read as undefined, so this
// returns false for everyone until premium ships.

export function computeIsPremium(profile) {
  if (!profile) return false
  return profile.is_founding_member === true
    || profile.plan_status === 'active'
    || profile.plan_status === 'past_due'
    || (!!profile.referral_premium_until && new Date(profile.referral_premium_until) > new Date())
}

// True when a user's only access to premium was a referral-earned window
// (not founding member, not a paid plan) and that window expired recently
// (within the last 14 days). Used to give the connection-cap modal a more
// pointed "refer again or upgrade" message instead of the generic free-tier
// copy, since these users are usually over-cap precisely because they used
// the trial to make extra connections.
export function hasLapsedReferralPremium(profile) {
  if (!profile) return false
  if (profile.is_founding_member === true) return false
  if (profile.plan_status === 'active' || profile.plan_status === 'past_due') return false
  if (!profile.referral_premium_until) return false
  const until = new Date(profile.referral_premium_until)
  const now = new Date()
  if (until > now) return false
  const daysSinceLapsed = (now - until) / (1000 * 60 * 60 * 24)
  return daysSinceLapsed <= 14
}

// Issue #866 Section 13: the onboarding-typing-chat premium discount is
// scoped to type_source === 'onboarding_chat' specifically (never
// self_reported/unset, even for someone who happens to be free-tier) AND
// is_premium() false. The discount stays scoped this way regardless of
// founding-member status or signup/retake source — see the migration
// header (20260702170000) for why type_source can't be self-granted.
export function isOnboardingChatCouponEligible(profile) {
  if (!profile) return false
  return profile.type_source === 'onboarding_chat' && !computeIsPremium(profile)
}
