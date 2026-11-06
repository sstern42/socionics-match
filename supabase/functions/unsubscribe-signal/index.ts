// supabase/functions/unsubscribe-signal/index.ts
// Unsubscribes the signed-in member from Socionics Signal, from the toggle in
// Profile -> Notifications (src/pages/ProfileNotifications.jsx).
//
// Flow:
//   1. Verify the caller's JWT with Supabase Auth (never trust the payload).
//   2. Remove the member's account email from the MailerLite Signal group.
//      This is a group removal, not an account-wide MailerLite unsubscribe,
//      so Socion updates and any other lists are left alone. A 404 (no such
//      subscriber, or not in the group) already meets the goal.
//   3. Only once MailerLite has done that, record it with
//      record_signal_opt_out() (20261106130000), so the record never says a
//      member is unsubscribed while MailerLite would still mail them.
//
// Subscribing again is through the feed and sidebar sign-ups
// (subscribe-signal), which reappear once signal_opt_in is FALSE.
//
// Secrets required:
//   SUPABASE_URL                (auto-injected)
//   PROJECT_SECRET_KEY          service role key (same as the other functions)
//   MAILERLITE_API_KEY          MailerLite API token (already set for subscribe-signal)
// Optional:
//   MAILERLITE_SIGNAL_GROUP_ID  overrides the default Signal group id below

import { createClient } from 'npm:@supabase/supabase-js'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY        = Deno.env.get('PROJECT_SECRET_KEY')!
const MAILERLITE_API_KEY = Deno.env.get('MAILERLITE_API_KEY')
// MailerLite group "Socionics Insight - Socionics Signal"
const SIGNAL_GROUP_ID    = Deno.env.get('MAILERLITE_SIGNAL_GROUP_ID') ?? '203226992088188319'

const MAILERLITE_API = 'https://connect.mailerlite.com/api'
const MAILERLITE_TIMEOUT_MS = 8000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Returns true once the address is not in the Signal group (removed now, or
// never there). False on any MailerLite failure, which is logged.
async function removeFromSignalGroup(email: string): Promise<boolean> {
  const headers = {
    'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    'Accept': 'application/json',
  }
  try {
    const lookup = await fetch(`${MAILERLITE_API}/subscribers/${encodeURIComponent(email)}`, {
      headers,
      signal: AbortSignal.timeout(MAILERLITE_TIMEOUT_MS),
    })
    if (lookup.status === 404) return true
    if (!lookup.ok) {
      console.error('MailerLite lookup failed:', lookup.status, await lookup.text())
      return false
    }
    const id = (await lookup.json())?.data?.id
    if (!id) {
      console.error('MailerLite lookup returned no subscriber id')
      return false
    }
    const res = await fetch(
      `${MAILERLITE_API}/subscribers/${encodeURIComponent(id)}/groups/${encodeURIComponent(SIGNAL_GROUP_ID)}`,
      { method: 'DELETE', headers, signal: AbortSignal.timeout(MAILERLITE_TIMEOUT_MS) },
    )
    if (!res.ok && res.status !== 404) {
      console.error('MailerLite group removal failed:', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('MailerLite group removal failed:', (err as Error).message)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorised' }, 401)
  const jwt = authHeader.replace('Bearer ', '')

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error: authError } = await admin.auth.getUser(jwt)
  if (authError || !authData?.user) return json({ error: 'Unauthorised' }, 401)

  const email = authData.user.email?.trim().toLowerCase()
  if (!email) return json({ error: 'Your account has no email address.' }, 400)

  const { data: member, error: memberErr } = await admin
    .from('users')
    .select('id, signal_opt_in')
    .eq('auth_id', authData.user.id)
    .maybeSingle()
  if (memberErr) {
    console.error('Member lookup failed:', memberErr.message)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
  if (!member) return json({ error: 'Finish setting up your profile first.' }, 400)
  if (member.signal_opt_in !== true) return json({ ok: true, already: true })

  if (!MAILERLITE_API_KEY) {
    console.error('unsubscribe-signal: MAILERLITE_API_KEY is not set')
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }

  if (!(await removeFromSignalGroup(email))) {
    return json({ error: 'Something went wrong. Please try again.' }, 502)
  }

  const { error: recordErr } = await admin.rpc('record_signal_opt_out', { p_user_id: member.id })
  if (recordErr) {
    // MailerLite has already removed them, so the unsubscribe itself worked.
    // Log loudly so the record can be fixed by hand, and still report an
    // error so the toggle doesn't show a state the database doesn't hold.
    console.error(`record_signal_opt_out failed for user ${member.id}:`, recordErr.message)
    return json({ error: 'You have been unsubscribed, but we couldn\'t save that here. Please refresh.' }, 500)
  }

  return json({ ok: true })
})
