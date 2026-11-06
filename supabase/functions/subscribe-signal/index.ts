// supabase/functions/subscribe-signal/index.ts
// Subscribes the signed-in member to Socionics Signal, Spencer's email
// newsletter run from socionicsinsight.com, using their account email.
//
// Called from the feed's "New on Socionics Insight" card and the right
// sidebar's "From the founder" card (src/components/feed/SignalSubscribe.jsx).
// The member clicks a button next to the consent wording archived in
// docs/policies/consent-text-v2.md; that click is the consent.
//
// Flow:
//   1. Verify the caller's JWT with Supabase Auth (never trust the payload).
//   2. Refuse addresses that are banned, or suppressed as bounced/complained
//      (those can't or shouldn't be mailed, whatever the member asks).
//   3. Upsert the subscriber in MailerLite and add them to the Signal group.
//      POST /subscribers is non-destructive: existing groups and fields are
//      kept. status 'active' is sent because this is a fresh, explicit opt-in.
//   4. Only once MailerLite has accepted it, record the consent with
//      record_signal_opt_in() (20261106120000), so the record never claims a
//      subscription that didn't happen.
//
// Unsubscribing is through the link in any Signal email. MailerLite's
// unsubscribe is account-wide and reaches Socion through mailerlite-webhook,
// which calls suppress_email() and clears signal_opt_in.
//
// Secrets required:
//   SUPABASE_URL                (auto-injected)
//   PROJECT_SECRET_KEY          service role key (same as the other functions)
//   MAILERLITE_API_KEY          MailerLite API token (already set for delete-account)
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

const ALLOWED_SOURCES = new Set(['signal_feed_card_v1', 'signal_sidebar_v1'])

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorised' }, 401)
  const jwt = authHeader.replace('Bearer ', '')

  let source = ''
  try {
    source = (await req.json())?.source ?? ''
  } catch { /* empty or non-JSON body */ }
  if (!ALLOWED_SOURCES.has(source)) return json({ error: 'Invalid request' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error: authError } = await admin.auth.getUser(jwt)
  if (authError || !authData?.user) return json({ error: 'Unauthorised' }, 401)

  const email = authData.user.email?.trim().toLowerCase()
  if (!email) return json({ error: 'Your account has no email address to subscribe.' }, 400)

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
  if (member.signal_opt_in === true) return json({ ok: true, already: true })

  // banned_emails isn't stored lowercased, so match case-insensitively with
  // ilike, escaping its wildcards (an underscore is common in addresses).
  const emailPattern = email.replace(/[\\%_]/g, (c) => `\\${c}`)
  const [{ data: banned }, { data: suppression }] = await Promise.all([
    admin.from('banned_emails').select('email').ilike('email', emailPattern).limit(1).maybeSingle(),
    admin.from('email_suppressions').select('reason').eq('email', email).maybeSingle(),
  ])
  if (banned || (suppression && suppression.reason !== 'unsubscribed')) {
    return json({ error: "We can't send email to this address." }, 409)
  }

  if (!MAILERLITE_API_KEY) {
    console.error('subscribe-signal: MAILERLITE_API_KEY is not set')
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }

  try {
    const res = await fetch(`${MAILERLITE_API}/subscribers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, groups: [SIGNAL_GROUP_ID], status: 'active' }),
      signal: AbortSignal.timeout(MAILERLITE_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error('MailerLite subscribe failed:', res.status, await res.text())
      return json({ error: 'Something went wrong. Please try again.' }, 502)
    }
  } catch (err) {
    console.error('MailerLite subscribe failed:', (err as Error).message)
    return json({ error: 'Something went wrong. Please try again.' }, 502)
  }

  const { error: recordErr } = await admin.rpc('record_signal_opt_in', {
    p_user_id: member.id,
    p_source: source,
  })
  if (recordErr) {
    // MailerLite has them, so the subscription itself worked. Log loudly so
    // the missing consent row can be added by hand; don't make the member
    // retry something that already succeeded.
    console.error(`record_signal_opt_in failed for user ${member.id} (source ${source}):`, recordErr.message)
  }

  return json({ ok: true })
})
