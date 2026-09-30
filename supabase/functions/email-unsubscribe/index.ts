// ============================================================================
// supabase/functions/email-unsubscribe/index.ts
// ============================================================================
// One-click unsubscribe for non-transactional Resend emails (the abandoned
// sign-up reminder and the referral tier-up note). Links are built by
// ../_shared/email.ts and carry ?e=<base64url email>&t=<HMAC of it>, so
// nobody can unsubscribe an address they didn't receive mail at.
//
//   POST  Performs the unsubscribe. This is both the RFC 8058 one-click
//         target (mail clients POST "List-Unsubscribe=One-Click" to the URL in
//         the List-Unsubscribe header) and what the confirmation page at
//         socion.app/unsubscribe calls when the person presses the button.
//         Idempotent: repeat POSTs return the same 200.
//   GET   Never unsubscribes: link scanners and mail-security proxies prefetch
//         GETs, and RFC 8058 forbids acting on them. It 303-redirects to the
//         confirmation page on the site instead of rendering one here, because
//         Supabase serves text/html from Edge Functions on the default
//         *.supabase.co domain as text/plain for GET requests, which would
//         show people raw markup.
//
// Effect of an unsubscribe (suppress_email(), 20260930120000):
//   * the address goes into email_suppressions (reason 'unsubscribed',
//     source 'email_unsubscribe_link'), which every non-transactional
//     sender checks, MailerLite exports included;
//   * if a member has that address, marketing_opt_in becomes FALSE and a
//     consent_events row is written.
//
// Deployment:
//   JWT verification must be OFF — mail providers' one-click POSTs carry no
//   Supabase JWT. Edge Functions → email-unsubscribe → Settings → toggle off
//   "Verify JWT". Deploy with the CLI (supabase functions deploy
//   email-unsubscribe) so ../_shared is bundled.
//
// Env:
//   UNSUBSCRIBE_SECRET   secret shared with the senders (see _shared/email.ts)
//   PROJECT_SECRET_KEY   service role key (same as the other functions)
//   SITE_URL             optional, defaults to https://socion.app
// Auto-injected:
//   SUPABASE_URL
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'
import { decodeEmailParam, verifyUnsubscribeToken } from '../_shared/email.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('PROJECT_SECRET_KEY')!
const SITE_URL     = (Deno.env.get('SITE_URL') ?? 'https://socion.app').replace(/\/$/, '')

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// The token is the credential, so any origin may call this; the confirmation
// page on socion.app needs CORS to read the response.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const e = url.searchParams.get('e') ?? ''
  const t = url.searchParams.get('t') ?? ''

  if (req.method === 'GET') {
    const target = `${SITE_URL}/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`
    return new Response(null, { status: 303, headers: { ...corsHeaders, Location: target } })
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const email = decodeEmailParam(e)
  if (!email || !t || !(await verifyUnsubscribeToken(email, t))) {
    return json({ error: 'Invalid unsubscribe link' }, 400)
  }

  const { error } = await supabase.rpc('suppress_email', {
    p_email: email,
    p_reason: 'unsubscribed',
    p_source: 'email_unsubscribe_link',
  })
  if (error) {
    console.error('suppress_email failed:', error.message)
    return json({ error: 'Could not unsubscribe right now. Please try again.' }, 500)
  }

  return json({ ok: true })
})
