import { supabase } from './supabase'

// Marketing-email consent ("Socion updates by email", sent via MailerLite).
// Wording shown next to each capture point is archived in
// docs/policies/consent-text-v1.md — changing it needs a new version there
// and in set_marketing_preference() (20260930120000_email_marketing_consent.sql).
export const MARKETING_SOURCES = {
  signup: 'signup_v1',
  inAppPrompt: 'in_app_prompt_v1',
  settings: 'settings',
}

export const SIGNUP_CONSENT_TEXT = 'Send me occasional Socion updates by email. You can unsubscribe at any time.'

// Records the caller's answer server-side (timestamp, audit row, suppression
// list). The caller is derived from the session; there is no user id param.
export async function setMarketingPreference(optIn, source) {
  const { error } = await supabase.rpc('set_marketing_preference', { p_opt_in: optIn, p_source: source })
  if (error) throw error
}

// Service email about account activity (new messages). Not marketing.
export async function setEmailNotifications(enabled) {
  const { error } = await supabase.rpc('set_email_notifications', { p_enabled: enabled })
  if (error) throw error
}
