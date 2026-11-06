import { supabase, supabaseUrl, supabaseKey } from './supabase'

// Socionics Signal: Spencer's email newsletter, run from socionicsinsight.com.
// A separate consent from "Socion updates" (see emailPreferences.js). Wording
// shown next to each capture point is archived in
// docs/policies/consent-text-v2.md; changing it needs a new version there,
// new source values here, and matching ones in record_signal_opt_in()
// (20261106120000_socionics_signal_opt_in.sql).
export const SIGNAL_SOURCES = {
  feedCard: 'signal_feed_card_v1',
  sidebar: 'signal_sidebar_v1',
}

export const SIGNAL_CONSENT_TEXT = 'Free, occasional emails from Spencer. Unsubscribe from any email.'

async function callSignalFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Please sign in again.')
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  let json = {}
  try { json = await res.json() } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(json.error ?? `Something went wrong (${res.status}).`)
  return json
}

// Adds the signed-in member's account email to the Signal list. The server
// verifies the session, subscribes them in MailerLite and records the consent.
export function subscribeToSignal(source) {
  return callSignalFunction('subscribe-signal', { source })
}

// Removes the signed-in member from the Signal group in MailerLite (Socion
// updates are untouched) and records the opt-out. Used by the Settings toggle.
export function unsubscribeFromSignal() {
  return callSignalFunction('unsubscribe-signal')
}
