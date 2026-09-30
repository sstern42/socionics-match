// ============================================================================
// supabase/functions/_shared/email.ts
// ============================================================================
// Shared pieces for every Resend sender (stripe-webhook, send-referral-emails,
// notify-abandoned-signup): the compliance footer, and the signed one-click
// unsubscribe link and headers for non-transactional sends.
//
// Two footer variants:
//   transactional     — business identity + why you're receiving it. For
//                       emails the member needs about their account (billing,
//                       Premium, rewards they earned). No unsubscribe link:
//                       these continue while the account exists.
//   non-transactional — the same plus an unsubscribe link. Every send that
//                       uses it must also pass listUnsubscribeHeaders() so
//                       mail clients show their own one-click button
//                       (RFC 8058).
//
// Unsubscribe links carry the address plus an HMAC-SHA256 of it keyed with
// UNSUBSCRIBE_SECRET, so a link can't be forged for someone else's address.
// The email-unsubscribe function verifies it with verifyUnsubscribeToken().
// If UNSUBSCRIBE_SECRET is missing, building a non-transactional footer or
// headers throws: callers must treat that as "don't send" (fail closed)
// rather than send marketing without a working unsubscribe.
//
// Deploy note: `_shared/` is Supabase's convention for code imported by
// several functions. It is bundled by `supabase functions deploy <name>`;
// the dashboard's in-browser editor can't resolve `../_shared/` imports.
//
// Env:
//   UNSUBSCRIBE_SECRET  (secret; any long random string)
//   SUPABASE_URL        (auto-injected; used for the one-click POST URL)
//   SITE_URL            (optional; defaults to https://socion.app)
// ============================================================================

export const BUSINESS_IDENTITY =
  'Socion · Stern Consulting · Unit 110172, PO Box 6945, London, W1A 6US, UK'

export const ACCOUNT_REASON =
  "You're receiving this because you have an account at socion.app."

const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://socion.app').replace(/\/$/, '')
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')

// Domain separation: the MAC covers a purpose prefix as well as the address,
// so a token minted here can't be replayed as some other signed value if the
// secret is ever reused.
const TOKEN_PREFIX = 'socion-unsubscribe:v1:'

export function normaliseEmail(email: string): string {
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

export function encodeEmailParam(email: string): string {
  return toBase64Url(new TextEncoder().encode(normaliseEmail(email)))
}

export function decodeEmailParam(param: string): string | null {
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

export async function unsubscribeToken(email: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    new TextEncoder().encode(TOKEN_PREFIX + normaliseEmail(email)),
  )
  return toBase64Url(new Uint8Array(sig))
}

// crypto.subtle.verify compares in constant time.
export async function verifyUnsubscribeToken(email: string, token: string): Promise<boolean> {
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
export async function unsubscribePageUrl(email: string): Promise<string> {
  return `${SITE_URL}/unsubscribe?${await unsubscribeQuery(email)}`
}

// The URL mail clients POST to for one-click unsubscribe (RFC 8058).
export async function oneClickUnsubscribeUrl(email: string): Promise<string> {
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL is not set')
  return `${SUPABASE_URL}/functions/v1/email-unsubscribe?${await unsubscribeQuery(email)}`
}

// Headers for every non-transactional send. https only: nothing processes
// replies to noreply@, so a mailto: target would silently go nowhere.
export async function listUnsubscribeHeaders(email: string): Promise<Record<string, string>> {
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
export function transactionalFooter(style: FooterStyle = {}, reason: string = ACCOUNT_REASON): string {
  const color = style.color ?? '#666'
  return footerParagraph(
    `${escapeHtml(BUSINESS_IDENTITY)} · <a href="${SITE_URL}" style="color: ${color};">socion.app</a><br>${escapeHtml(reason)}`,
    style,
  )
}

// Footer for everything else. Throws if the unsubscribe link can't be signed.
export async function nonTransactionalFooter(
  email: string,
  style: FooterStyle = {},
  reason: string = ACCOUNT_REASON,
): Promise<string> {
  const color = style.color ?? '#666'
  const url = await unsubscribePageUrl(email)
  return footerParagraph(
    `${escapeHtml(BUSINESS_IDENTITY)} · <a href="${SITE_URL}" style="color: ${color};">socion.app</a><br>${escapeHtml(reason)}<br>` +
      `<a href="${escapeHtml(url)}" style="color: ${color};">Unsubscribe</a> from these emails.`,
    style,
  )
}
