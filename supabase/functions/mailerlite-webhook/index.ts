// ============================================================================
// supabase/functions/mailerlite-webhook/index.ts
// ============================================================================
// Receives MailerLite subscriber webhooks so an unsubscribe (or bounce, or
// spam complaint) in MailerLite is reflected in Socion. Without this, the
// next "Marketing-consented members" export from Admin would re-import
// someone who had already unsubscribed in MailerLite.
//
// Events handled:
//   subscriber.unsubscribed   → suppress_email(email, 'unsubscribed', ...)
//   subscriber.bounced        → suppress_email(email, 'bounced', ...)
//   subscriber.spam_reported  → suppress_email(email, 'complained', ...)
// Anything else is acknowledged with 200 and ignored.
//
// suppress_email() (20260930120000) adds the address to email_suppressions
// (source 'mailerlite_unsubscribe') and, if a member has that address, sets
// marketing_opt_in = FALSE and writes a consent_events row. It is idempotent:
// the suppression insert is ON CONFLICT DO NOTHING and the member row / audit
// row are only written when the member isn't already opted out. So MailerLite
// retries and duplicate deliveries are safe, and on any database error this
// returns 500 so MailerLite retries.
//
// Signature: MailerLite sends a `Signature` header containing the
// HMAC-SHA256 of the raw request body, keyed with the webhook's own secret
// (shown in the dashboard when the webhook is created). It is checked before
// the body is parsed. Both hex and base64 encodings of the digest are accepted,
// because the encoding could not be confirmed against MailerLite's docs when
// this was written; both are the same MAC, so accepting either doesn't weaken
// the check. The payload parser likewise accepts both single-event and
// batched ({ "events": [...] }) deliveries. Use the dashboard's "Test
// webhook" button after setup and check the function logs.
//
// ---------------------------------------------------------------------------
// Dashboard setup
// ---------------------------------------------------------------------------
// 1. Deploy:  supabase functions deploy mailerlite-webhook --no-verify-jwt
//    (MailerLite sends no Supabase JWT; if deploying another way, turn off
//    "Verify JWT" under Edge Functions → mailerlite-webhook → Settings.)
// 2. MailerLite → Integrations → API → Webhooks → Create webhook:
//      Name:   Socion suppressions
//      URL:    https://<project-ref>.supabase.co/functions/v1/mailerlite-webhook
//      Events: Subscriber unsubscribed, Subscriber bounced,
//              Subscriber spam reported (tick only these)
//    Save, then copy the webhook's secret.
// 3. Supabase → Edge Functions → Secrets: set MAILERLITE_WEBHOOK_SECRET to
//    that secret. PROJECT_SECRET_KEY is already set for the other functions.
// 4. Press "Test webhook" (or unsubscribe a test address from a test
//    campaign) and confirm a 200 in the function logs and a row in
//    email_suppressions.
//
// Env:
//   MAILERLITE_WEBHOOK_SECRET   webhook signing secret from MailerLite
//   PROJECT_SECRET_KEY          service role key
// Auto-injected:
//   SUPABASE_URL
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('PROJECT_SECRET_KEY')!
const WEBHOOK_SECRET = Deno.env.get('MAILERLITE_WEBHOOK_SECRET')

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const EVENT_REASONS: Record<string, 'unsubscribed' | 'bounced' | 'complained'> = {
  'subscriber.unsubscribed':  'unsubscribed',
  'subscriber.bounced':       'bounced',
  'subscriber.spam_reported': 'complained',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
    const out = new Uint8Array(new ArrayBuffer(bin.length))
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

// crypto.subtle.verify compares in constant time.
async function verifySignature(rawBody: Uint8Array<ArrayBuffer>, header: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const candidates = [hexToBytes(header.trim()), base64ToBytes(header.trim())]
  for (const sig of candidates) {
    if (sig && sig.length === 32 && await crypto.subtle.verify('HMAC', key, sig, rawBody)) return true
  }
  return false
}

type Suppression = { email: string; reason: 'unsubscribed' | 'bounced' | 'complained' }

// Pull (email, reason) pairs out of a single-event or batched payload.
function extractSuppressions(payload: unknown): Suppression[] {
  const p = payload as Record<string, unknown>
  const events = Array.isArray(p?.events) ? (p.events as Record<string, unknown>[]) : [p]
  const out: Suppression[] = []
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    const type = (ev.type ?? ev.event) as string | undefined
    const reason = type ? EVENT_REASONS[type] : undefined
    if (!reason) continue
    const data = ev.data as Record<string, unknown> | undefined
    const subscriber = (data?.subscriber ?? ev.subscriber ?? data ?? ev) as Record<string, unknown>
    const email = typeof subscriber?.email === 'string' ? subscriber.email.trim().toLowerCase() : ''
    if (email.includes('@')) out.push({ email, reason })
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!WEBHOOK_SECRET) {
    console.error('MAILERLITE_WEBHOOK_SECRET is not set')
    return json({ error: 'Not configured' }, 500)
  }

  const raw = new Uint8Array(await req.arrayBuffer())
  const signature = req.headers.get('Signature') ?? ''
  if (!signature || !(await verifySignature(raw, signature, WEBHOOK_SECRET))) {
    return json({ error: 'Invalid signature' }, 401)
  }

  let payload: unknown
  try {
    payload = JSON.parse(new TextDecoder().decode(raw))
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const suppressions = extractSuppressions(payload)
  let changed = 0
  for (const { email, reason } of suppressions) {
    const { data, error } = await supabase.rpc('suppress_email', {
      p_email: email,
      p_reason: reason,
      p_source: 'mailerlite_unsubscribe',
    })
    if (error) {
      // 5xx makes MailerLite retry the whole delivery; already-processed
      // addresses in it are no-ops the second time.
      console.error('suppress_email failed:', error.message)
      return json({ error: 'Database error' }, 500)
    }
    if (data === true) changed++
  }

  return json({ ok: true, processed: suppressions.length, membersUpdated: changed })
})
