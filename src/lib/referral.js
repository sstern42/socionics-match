import { supabase, supabaseUrl, supabaseKey } from './supabase'

const STORAGE_KEY = 'socion_referral_code'
const NAME_STORAGE_KEY = 'socion_referrer_name'

export function storeReferralCode(code) {
  sessionStorage.setItem(STORAGE_KEY, code)
  localStorage.setItem(STORAGE_KEY, code)
}

export function getStoredReferralCode() {
  return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || null
}

export function storeReferrerName(name) {
  if (!name) return
  sessionStorage.setItem(NAME_STORAGE_KEY, name)
  localStorage.setItem(NAME_STORAGE_KEY, name)
}

export function getStoredReferrerName() {
  return sessionStorage.getItem(NAME_STORAGE_KEY) || localStorage.getItem(NAME_STORAGE_KEY) || null
}

export function clearStoredReferralCode() {
  sessionStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(NAME_STORAGE_KEY)
  localStorage.removeItem(NAME_STORAGE_KEY)
}

// Looked up once, when the referral link is first visited (pre-signup, so
// it can't depend on auth.uid()) — stored alongside the code so the
// onboarding banner can render the referrer's name with no extra round trip.
export async function lookupReferrerName(code) {
  const { data, error } = await supabase.rpc('get_referrer_display_name', { p_code: code })
  if (error) {
    console.error('Referrer name lookup failed:', error)
    return null
  }
  return data
}

// Attributes a brand-new account to whoever owns the stored referral code
// (no-op server-side if the code is invalid, self-referral, or the referee
// is already attributed), then immediately checks whether the qualifying
// action — type + purpose, just persisted by createProfile() — already
// satisfies the reward conditions. Errors are swallowed: a referral hiccup
// should never block account creation.
export async function attributeAndRewardReferral(refereeId) {
  const code = getStoredReferralCode()
  if (!code) return

  try {
    const { error: attributeError } = await supabase.rpc('attribute_referral', {
      p_code: code,
      p_referee_id: refereeId,
    })
    if (attributeError) throw attributeError

    const { error: rewardError } = await supabase.rpc('grant_referral_reward', {
      p_referee_id: refereeId,
    })
    if (rewardError) throw rewardError

    await sendReferralEmails(refereeId)
  } catch (err) {
    console.error('Referral attribution/reward failed:', err)
  } finally {
    clearStoredReferralCode()
  }
}

// Fire-and-forget: notifies the referee (welcome + trial) and referrer
// (reward earned) by email. The edge function no-ops if grant_referral_reward
// didn't actually find a qualifying referral, so this is safe to call
// unconditionally. Never throws — an email failure shouldn't surface to the
// user who just successfully created their account.
async function sendReferralEmails(refereeId) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return
    await fetch(`${supabaseUrl}/functions/v1/send-referral-emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refereeId }),
    })
  } catch (err) {
    console.error('Referral email trigger failed:', err)
  }
}
