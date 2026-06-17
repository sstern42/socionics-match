import { supabase } from './supabase'

const STORAGE_KEY = 'socion_referral_code'

export function storeReferralCode(code) {
  sessionStorage.setItem(STORAGE_KEY, code)
  localStorage.setItem(STORAGE_KEY, code)
}

export function getStoredReferralCode() {
  return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || null
}

export function clearStoredReferralCode() {
  sessionStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_KEY)
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
  } catch (err) {
    console.error('Referral attribution/reward failed:', err)
  } finally {
    clearStoredReferralCode()
  }
}
