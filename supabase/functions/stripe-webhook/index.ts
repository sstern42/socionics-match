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
<p style="color: #666; font-size: 13px; margin: 0;">Socion · <a href="https://socion.app" style="color: #666;">socion.app</a></p>
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
<p>If you change your mind, you can resubscribe anytime — your data picks up right where you left off.</p>
<p><a href="https://socion.app/premium" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">Resubscribe</a></p>
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

  // Idempotency: skip if we've already processed this event
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing) {
    console.log(`Event ${event.id} already processed`)
    return new Response('Already processed', { status: 200 })
  }

  // Log event before processing
  const { error: logError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    })

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

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(`Handler error for ${event.type} (${event.id}):`, (err as Error).message)
    // Return 500 so Stripe retries on transient errors
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 })
  }
})
