// ============================================================================
// supabase/functions/email-unsubscribe/index.ts
// ============================================================================
// One-click unsubscribe for non-transactional Resend emails (the abandoned
// sign-up reminder and the referral tier-up note). Links are built by the
// email helpers block (below; the senders carry identical copies) and carry ?e=<base64url email>&t=<HMAC of it>, so
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
//   "Verify JWT". Self-contained, so it can be deployed from the dashboard
//   editor or with `supabase functions deploy email-unsubscribe --no-verify-jwt`.
//
// Env:
//   UNSUBSCRIBE_SECRET   secret shared with the senders (see the email helpers block)
//   PROJECT_SECRET_KEY   service role key (same as the other functions)
//   SITE_URL             optional, defaults to https://socion.app
// Auto-injected:
//   SUPABASE_URL
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'

// ---- BEGIN email helpers ----------------------------------------------------
// Identical copy in each Resend sender and in email-unsubscribe, so every
// function is a single file that can be pasted into the dashboard editor:
//   email-unsubscribe, notify-abandoned-signup, send-referral-emails,
//   stripe-webhook
// Change all four together; `npm run check:email-helpers` (run in CI) fails if
// the copies differ.
//
// Footer variants:
//   transactional     — business identity + why you're receiving it. For
//                       emails the member needs about their account (billing,
//                       Premium, rewards they earned). No unsubscribe link.
//   non-transactional — the same plus an unsubscribe link. Every send that
//                       uses it must also pass listUnsubscribeHeaders()
//                       (RFC 8058 one-click).
//
// Unsubscribe links carry the address plus an HMAC-SHA256 of it keyed with
// UNSUBSCRIBE_SECRET, so a link can't be forged for someone else's address.
// If UNSUBSCRIBE_SECRET is missing, building a non-transactional footer or
// headers throws: callers treat that as "don't send" (fail closed).
//
// Env: UNSUBSCRIBE_SECRET (secret), SUPABASE_URL (auto-injected),
//      SITE_URL (optional, defaults to https://socion.app)

// Mirrors EMAIL_IDENTITY in src/config/legal.js, the source of truth for the
// operator's name and address (edge functions can't import from src/). The
// email helpers check fails if the two differ.
const BUSINESS_IDENTITY =
  'Socion · Spencer Stern t/a Stern Consulting · Unit 110172, PO Box 6945, London W1A 6US, United Kingdom'

const ACCOUNT_REASON =
  "You're receiving this because you have an account at socion.app."

const EMAIL_SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://socion.app').replace(/\/$/, '')
const EMAIL_SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')

// Domain separation: the MAC covers a purpose prefix as well as the address,
// so a token minted here can't be replayed as some other signed value if the
// secret is ever reused.
const TOKEN_PREFIX = 'socion-unsubscribe:v1:'

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function encodeEmailParam(email: string): string {
  return toBase64Url(new TextEncoder().encode(normaliseEmail(email)))
}

function decodeEmailParam(param: string): string | null {
  try {
    const email = normaliseEmail(new TextDecoder().decode(fromBase64Url(param)))
    return email.includes('@') ? email : null
  } catch {
    return null
  }
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('UNSUBSCRIBE_SECRET')
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET is not set')
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function unsubscribeToken(email: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    new TextEncoder().encode(TOKEN_PREFIX + normaliseEmail(email)),
  )
  return toBase64Url(new Uint8Array(sig))
}

// crypto.subtle.verify compares in constant time.
async function verifyUnsubscribeToken(email: string, token: string): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      fromBase64Url(token),
      new TextEncoder().encode(TOKEN_PREFIX + normaliseEmail(email)),
    )
  } catch {
    return false
  }
}

async function unsubscribeQuery(email: string): Promise<string> {
  return `e=${encodeEmailParam(email)}&t=${await unsubscribeToken(email)}`
}

// The link people click in the footer: a confirmation page on the site, which
// then POSTs to the email-unsubscribe function.
async function unsubscribePageUrl(email: string): Promise<string> {
  return `${EMAIL_SITE_URL}/unsubscribe?${await unsubscribeQuery(email)}`
}

// The URL mail clients POST to for one-click unsubscribe (RFC 8058).
async function oneClickUnsubscribeUrl(email: string): Promise<string> {
  if (!EMAIL_SUPABASE_URL) throw new Error('SUPABASE_URL is not set')
  return `${EMAIL_SUPABASE_URL}/functions/v1/email-unsubscribe?${await unsubscribeQuery(email)}`
}

// Headers for every non-transactional send. https only: nothing processes
// replies to noreply@, so a mailto: target would silently go nowhere.
async function listUnsubscribeHeaders(email: string): Promise<Record<string, string>> {
  return {
    'List-Unsubscribe': `<${await oneClickUnsubscribeUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

type FooterStyle = {
  color?: string
  fontFamily?: string
  fontSize?: string
  align?: 'left' | 'center'
}

function footerParagraph(inner: string, style: FooterStyle): string {
  const color = style.color ?? '#666'
  const font = style.fontFamily ? `font-family: ${style.fontFamily}; ` : ''
  const size = style.fontSize ?? '12px'
  const align = style.align ?? 'left'
  return `<p style="${font}color: ${color}; font-size: ${size}; line-height: 1.6; margin: 0; text-align: ${align};">${inner}</p>`
}

// Footer for account emails (no unsubscribe link).
function transactionalFooter(style: FooterStyle = {}, reason: string = ACCOUNT_REASON): string {
  const color = style.color ?? '#666'
  return footerParagraph(
    `${escapeHtml(BUSINESS_IDENTITY)} · <a href="${EMAIL_SITE_URL}" style="color: ${color};">socion.app</a><br>${escapeHtml(reason)}`,
    style,
  )
}

// Footer for everything else. Throws if the unsubscribe link can't be signed.
async function nonTransactionalFooter(
  email: string,
  style: FooterStyle = {},
  reason: string = ACCOUNT_REASON,
): Promise<string> {
  const color = style.color ?? '#666'
  const url = await unsubscribePageUrl(email)
  return footerParagraph(
    `${escapeHtml(BUSINESS_IDENTITY)} · <a href="${EMAIL_SITE_URL}" style="color: ${color};">socion.app</a><br>${escapeHtml(reason)}<br>` +
      `<a href="${escapeHtml(url)}" style="color: ${color};">Unsubscribe</a> from these emails.`,
    style,
  )
}
// ---- END email helpers ------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('PROJECT_SECRET_KEY')!

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
    const target = `${EMAIL_SITE_URL}/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`
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
