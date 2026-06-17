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
