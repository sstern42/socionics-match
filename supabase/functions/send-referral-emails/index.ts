// ============================================================================
// supabase/functions/send-referral-emails/index.ts
// ============================================================================
// Called by the client right after grant_referral_reward() succeeds (see
// src/lib/referral.js attributeAndRewardReferral). Sends two emails:
//   - to the referee: welcome + 7-day trial unlocked
//   - to the referrer: reward earned (days granted), or a tier-up
//     acknowledgement if they're already premium and no days were granted
//
// Classification (see the email helpers block below):
//   - referee welcome / trial active   transactional (their account just
//                                      changed: a trial was switched on)
//   - referrer "You earned N days"     transactional (days were added to
//                                      their account)
//   - referrer "Another successful     non-transactional: nothing about the
//     referral" (tier-up)              account changed. Only sent when
//                                      can_send_marketing() is TRUE, with the
//                                      unsubscribe footer and headers.
//
// No-ops quietly if the referee has no 'qualified' referrals row — this lets
// the client call it unconditionally after every signup, referred or not.
//
// JWT verification SHOULD STAY ON for this function. The caller must be the
// referee themselves (checked below), not just any authenticated user.
//
// Required env vars (shared with other functions):
//   RESEND_API_KEY
//   UNSUBSCRIBE_SECRET  (tier-up email only; see the email helpers block below)
// Auto-injected:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Frontend call pattern: see src/lib/referral.js sendReferralEmails()
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'
import { Resend } from 'https://esm.sh/resend@4.0.0?target=denonext'

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

const BUSINESS_IDENTITY =
  'Socion · Stern Consulting · Unit 110172, PO Box 6945, London, W1A 6US, UK'

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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('PROJECT_SECRET_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM = 'Socion <noreply@mail.socion.app>'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(RESEND_API_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const TIER_LABELS: Record<string, string> = {
  connector: 'Connector',
  networker: 'Networker',
  catalyst: 'Catalyst',
  catalyst_plus: 'Catalyst+',
}

async function getContact(userId: string): Promise<{ email: string; name: string | null } | null> {
  const { data: user } = await supabase
    .from('users')
    .select('auth_id, profile_data')
    .eq('id', userId)
    .maybeSingle()

  if (!user?.auth_id) return null

  const { data: authData } = await supabase.auth.admin.getUserById(user.auth_id)
  const email = authData?.user?.email
  if (!email) return null

  return {
    email,
    name: (user.profile_data as Record<string, unknown> | null)?.name as string | null ?? null,
  }
}

async function sendEmailSafe(args: { to: string; subject: string; html: string; headers?: Record<string, string> }): Promise<void> {
  try {
    await resend.emails.send({ from: RESEND_FROM, ...args })
  } catch (err) {
    console.error('Resend send failed:', (err as Error).message)
  }
}

function emailShell(body: string, footer: string = transactionalFooter()): string {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.5;">
${body}
<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;">
${footer}
</body></html>`
}

function emailRefereeWelcome(name: string | null, referrerName: string | null): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return emailShell(`
<h2 style="margin-top: 0;">Your 7-day Premium trial is active</h2>
<p>${greeting}</p>
<p>Thanks for finishing your profile${referrerName ? ` — you joined through ${referrerName}'s invite` : ''}. Your account now has <strong>7 days of Socion Premium</strong>, starting today. There's nothing to set up and no payment details are needed; when the 7 days are up, the trial simply ends and nothing is charged.</p>
<p>You can check your plan any time in <a href="https://socion.app/settings" style="color: #1a1a1a;">Settings</a>.</p>
`)
}

function emailReferrerRewardEarned(name: string | null, days: number, totalDaysGranted: number): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return emailShell(`
<h2 style="margin-top: 0;">🎉 You earned ${days} days of Premium</h2>
<p>${greeting}</p>
<p>Someone you invited just finished setting up their Socion profile — your referral reward is now active.</p>
<p><a href="https://socion.app/settings" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">See your invite stats</a></p>
<p style="color: #666; font-size: 13px; margin-top: 16px;">Referral rewards cap at 180 days of Premium total — you're at ${totalDaysGranted} so far.</p>
`)
}

function emailReferrerTierUp(name: string | null, tier: string | null, count: number, footer: string): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const tierLabel = tier ? TIER_LABELS[tier] ?? tier : null
  return emailShell(`
<h2 style="margin-top: 0;">🎉 Another successful referral${tierLabel ? ` — you're a ${tierLabel} now` : ''}</h2>
<p>${greeting}</p>
<p>Someone you invited just finished setting up their Socion profile. That's ${count} qualifying ${count === 1 ? 'referral' : 'referrals'} so far.</p>
<p><a href="https://socion.app/settings" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">See your invite stats</a></p>
`, footer)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)
  const token = authHeader.replace(/^Bearer\s+/i, '')

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return json({ error: 'Unauthorized' }, 401)

  let refereeId: string | undefined
  try {
    const body = await req.json()
    refereeId = body.refereeId
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!refereeId) return json({ error: 'Missing refereeId' }, 400)

  // The caller must be the referee themselves — this function only ever
  // notifies parties about a referral the caller is actually party to.
  const { data: callerRow } = await supabase
    .from('users')
    .select('id')
    .eq('id', refereeId)
    .eq('auth_id', authUser.id)
    .maybeSingle()
  if (!callerRow) return json({ error: 'Forbidden' }, 403)

  const { data: referral } = await supabase
    .from('referrals')
    .select('referrer_id, reward_days_granted')
    .eq('referee_id', refereeId)
    .eq('status', 'qualified')
    .maybeSingle()

  if (!referral) return json({ ok: true, skipped: 'no qualified referral' })

  const refereeContact = await getContact(refereeId)
  const referrerContact = await getContact(referral.referrer_id)

  if (refereeContact) {
    await sendEmailSafe({
      to: refereeContact.email,
      subject: 'Your 7-day Socion Premium trial is active',
      html: emailRefereeWelcome(refereeContact.name, referrerContact?.name ?? null),
    })
  }

  if (referrerContact) {
    if (referral.reward_days_granted > 0) {
      const { data: referrerRow } = await supabase
        .from('users')
        .select('referral_premium_days_granted')
        .eq('id', referral.referrer_id)
        .maybeSingle()
      await sendEmailSafe({
        to: referrerContact.email,
        subject: `You earned ${referral.reward_days_granted} days of Premium`,
        html: emailReferrerRewardEarned(referrerContact.name, referral.reward_days_granted, referrerRow?.referral_premium_days_granted ?? referral.reward_days_granted),
      })
    } else {
      // Nothing changed on their account, so this is non-transactional:
      // consented members only, and never without a working unsubscribe.
      const { data: canSend, error: consentErr } = await supabase.rpc('can_send_marketing', { p_email: referrerContact.email })
      if (consentErr) console.error('can_send_marketing failed:', consentErr.message)
      if (canSend === true) {
        try {
          const footer = await nonTransactionalFooter(referrerContact.email)
          const headers = await listUnsubscribeHeaders(referrerContact.email)
          const { data: referrerRow } = await supabase
            .from('users')
            .select('referral_count_qualified')
            .eq('id', referral.referrer_id)
            .maybeSingle()
          const { data: tier } = await supabase.rpc('referral_tier', { p_user_id: referral.referrer_id })
          await sendEmailSafe({
            to: referrerContact.email,
            subject: 'Another successful referral',
            html: emailReferrerTierUp(referrerContact.name, tier, referrerRow?.referral_count_qualified ?? 0, footer),
            headers,
          })
        } catch (err) {
          console.error('Tier-up email skipped:', (err as Error).message)
        }
      }
    }
  }

  return json({ ok: true })
})
