// ============================================================================
// supabase/functions/stripe-webhook/index.ts
// ============================================================================
// Handles Stripe webhook events for Socion Premium subscriptions.
//
// Events handled:
//   - checkout.session.completed     → plan_status='active', save IDs, welcome email
//   - customer.subscription.updated  → sync plan_status, update period_end
//   - customer.subscription.deleted  → plan_status='canceled', cancellation email
//   - invoice.payment_succeeded      → refresh period_end (renewal)
//   - invoice.payment_failed         → plan_status='past_due', payment-failed email
//
// Required environment variables (set via Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY          sk_test_... (sandbox) or sk_live_... (production)
//   STRIPE_WEBHOOK_SECRET      whsec_... (from Stripe webhook endpoint config)
//   RESEND_API_KEY             your existing Resend key
//
// All three emails here (Premium welcome, payment failed, Premium ended) are
// transactional: they report a change to the member's subscription. They use
// the transactional footer from the email helpers block below, and no
// unsubscribe link.
//
// Auto-injected by Supabase (do not set manually):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deployment:
//   supabase/functions/stripe-webhook/index.ts must be deployed with JWT verification
//   DISABLED, because Stripe sends webhooks without a Supabase JWT. In the dashboard:
//   Edge Functions → stripe-webhook → Settings → toggle off "Verify JWT".
//
// Webhook URL once deployed:
//   https://hetjmvwhyibsxrkkgury.supabase.co/functions/v1/stripe-webhook
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext'
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

// ============================================================================
// Setup
// ============================================================================

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('PROJECT_SECRET_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

const RESEND_FROM = 'Socion <noreply@mail.socion.app>'

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const resend = new Resend(RESEND_API_KEY)

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map Stripe subscription.status to the users.plan_status enum.
 * 'past_due' is preserved to maintain access during Stripe's dunning grace period.
 */
function mapStatus(stripeStatus: string): 'active' | 'past_due' | 'canceled' | 'free' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'free'
  }
}

/**
 * Look up a user's email and display name.
 * Email lives in auth.users (linked via users.auth_id), name in profile_data JSON.
 */
async function getUserContact(userId: string): Promise<{ email: string; name: string | null } | null> {
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

/**
 * Send an email but never throw — email failures should not cause Stripe retries.
 */
async function sendEmailSafe(args: { to: string; subject: string; html: string }): Promise<void> {
  try {
    await resend.emails.send({ from: RESEND_FROM, ...args })
  } catch (err) {
    console.error('Resend send failed:', (err as Error).message)
  }
}

// ============================================================================
// Event handlers
// ============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id
  if (!userId) {
    console.error('checkout.session.completed: missing client_reference_id')
    return
  }
  if (session.mode !== 'subscription' || !session.subscription) {
    console.log('checkout.session.completed: not a subscription, skipping')
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const { error } = await supabase
    .from('users')
    .update({
      plan_status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      premium_started_at: new Date().toISOString(),
      premium_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', userId)

  if (error) throw new Error(`User update failed: ${error.message}`)

  const contact = await getUserContact(userId)
  if (contact) {
    await sendEmailSafe({
      to: contact.email,
      subject: 'Welcome to Socion Premium',
      html: emailWelcome(contact.name),
    })
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string

  const { error } = await supabase
    .from('users')
    .update({
      plan_status: mapStatus(subscription.status),
      stripe_subscription_id: subscription.id,
      premium_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) throw new Error(`User update failed: ${error.message}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string

  const { data: user, error } = await supabase
    .from('users')
    .update({ plan_status: 'canceled' })
    .eq('stripe_customer_id', customerId)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`User update failed: ${error.message}`)
  if (!user) {
    console.warn(`No user found for stripe_customer_id ${customerId}`)
    return
  }

  const contact = await getUserContact(user.id)
  if (contact) {
    await sendEmailSafe({
      to: contact.email,
      subject: 'Your Socion Premium has ended',
      html: emailCancellation(contact.name),
    })
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string | null
  if (!subscriptionId) return // one-off invoice, not subscription renewal

  const customerId = invoice.customer as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const { error } = await supabase
    .from('users')
    .update({
      plan_status: mapStatus(subscription.status),
      premium_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) throw new Error(`User update failed: ${error.message}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string

  const { data: user, error } = await supabase
    .from('users')
    .update({ plan_status: 'past_due' })
    .eq('stripe_customer_id', customerId)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`User update failed: ${error.message}`)
  if (!user) {
    console.warn(`No user found for stripe_customer_id ${customerId}`)
    return
  }

  const contact = await getUserContact(user.id)
  if (contact) {
    await sendEmailSafe({
      to: contact.email,
      subject: 'Action needed — your Socion Premium payment failed',
      html: emailPaymentFailed(contact.name),
    })
  }
}

// ============================================================================
// Email templates
// ============================================================================

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.5;">
${body}
<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;">
${transactionalFooter()}
</body></html>`
}

function emailWelcome(name: string | null): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return emailShell(`
<h2 style="margin-top: 0;">Welcome to Socion Premium</h2>
<p>${greeting}</p>
<p>You're now on Premium. Here's what's unlocked:</p>
<ul>
  <li>Unlimited connections</li>
  <li>All 16 relation types in your feed</li>
  <li>Full Model A compatibility breakdown on every connection</li>
  <li>Read receipts on messages you send</li>
</ul>
<p><a href="https://socion.app" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">Open Socion</a></p>
<p style="color: #666; font-size: 14px;">Your subscription renews annually. You can manage or cancel anytime in Settings.</p>
`)
}

function emailCancellation(name: string | null): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return emailShell(`
<h2 style="margin-top: 0;">Your Socion Premium has ended</h2>
<p>${greeting}</p>
<p>Your premium subscription has been cancelled. Your account, all your connections, and all your conversations are safe — nothing has been deleted.</p>
<p>What changes from here:</p>
<ul>
  <li>Existing connections stay accessible (you can keep messaging them)</li>
  <li>Your feed reverts to same-quadra matches only</li>
  <li>Compatibility breakdowns show in basic mode</li>
</ul>
<p>If you change your mind, you can <a href="https://socion.app/premium" style="color: #1a1a1a;">resubscribe</a> anytime — your data picks up right where you left off.</p>
`)
}

function emailPaymentFailed(name: string | null): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return emailShell(`
<h2 style="margin-top: 0;">Your payment didn't go through</h2>
<p>${greeting}</p>
<p>We tried to charge your card for your Socion Premium renewal, but the payment failed. Common reasons: expired card, insufficient funds, or your bank blocked the charge.</p>
<p>Stripe will retry automatically over the next two weeks. Your Premium features stay active during this grace period.</p>
<p>To fix it now, update your payment method:</p>
<p><a href="https://socion.app/settings" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">Update payment method</a></p>
<p style="color: #666; font-size: 14px;">If the retries don't succeed, your subscription will end automatically. Your account and data stay safe either way.</p>
`)
}

// ============================================================================
// Main handler
// ============================================================================

serve(async (req) => {
  // CORS preflight (unlikely from Stripe but harmless)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, stripe-signature',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  // Read raw body for signature verification
  const body = await req.text()

  // Verify signature
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    )
  } catch (err) {
    console.error('Signature verification failed:', (err as Error).message)
    return new Response(`Signature error: ${(err as Error).message}`, { status: 400 })
  }

  // Idempotency: skip only if a PRIOR delivery's handler ran to completion.
  // processed_at is stamped after the handler succeeds (see below), so a row
  // whose processed_at is still null means a previous attempt failed — that
  // event must be retried, not short-circuited.
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('processed_at')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing?.processed_at) {
    console.log(`Event ${event.id} already processed`)
    return new Response('Already processed', { status: 200 })
  }

  // Record receipt with processed_at = null. Upsert-ignore so a retry of a
  // previously-failed event reuses its row instead of erroring on the PK.
  const { error: logError } = await supabase
    .from('stripe_webhook_events')
    .upsert(
      {
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
        processed_at: null,
      },
      { onConflict: 'stripe_event_id', ignoreDuplicates: true },
    )

  if (logError) {
    console.error('Failed to log event:', logError.message)
    // Continue anyway — don't block on logging
  }

  // Route to handler
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark processed only now that the handler has succeeded. A retry before
    // this point re-runs the (idempotent) handler; a retry after is skipped.
    const { error: markError } = await supabase
      .from('stripe_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id)

    if (markError) {
      // Handler already succeeded, so state is correct; worst case a future
      // duplicate delivery re-runs the idempotent handler. Don't fail the request.
      console.error('Failed to mark event processed:', markError.message)
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(`Handler error for ${event.type} (${event.id}):`, (err as Error).message)
    // Return 500 so Stripe retries on transient errors
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 })
  }
})
