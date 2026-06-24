// ============================================================================
// supabase/functions/create-checkout-session/index.ts
// ============================================================================
// Called by the frontend when a free-tier user clicks "Upgrade to Premium".
// Authenticates the caller, creates or retrieves their Stripe customer,
// and returns a Stripe Checkout Session URL for the React app to redirect to.
//
// JWT verification SHOULD STAY ON for this function — only authenticated users
// can call it. (Default Supabase setting, no need to toggle.)
//
// Required env vars (Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY            sk_test_... or sk_live_...
//   STRIPE_PREMIUM_PRICE_ID      price_1TbpNBAlbWeMPoC13a7K3IQw (your sandbox price)
//   APP_URL                      https://socion.app (or http://localhost:5173 for local dev)
//
// Auto-injected:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Frontend call pattern:
//   const { data: { session } } = await supabase.auth.getSession()
//   const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
//     method: 'POST',
//     headers: { Authorization: `Bearer ${session.access_token}` },
//   })
//   const { url } = await res.json()
//   window.location.href = url
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_PREMIUM_PRICE_ID = Deno.env.get('STRIPE_PREMIUM_PRICE_ID')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://socion.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('PROJECT_SECRET_KEY')!

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // 1. Authenticate caller
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)
  const token = authHeader.replace(/^Bearer\s+/i, '')

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return json({ error: 'Unauthorized' }, 401)

  // 2. Look up the public.users row
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, is_founding_member, plan_status, stripe_customer_id, profile_data')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (userError) {
    console.error('User lookup failed:', userError.message)
    return json({ error: 'User lookup failed' }, 500)
  }
  if (!user) {
    return json({ error: 'Profile not found. Complete onboarding first.' }, 404)
  }

  // 3. Guard: founding members already have permanent free premium
  if (user.is_founding_member) {
    return json({
      error: 'You already have founding member premium access — no payment needed.',
    }, 409)
  }

  // 4. Guard: existing active or past_due subscription should use portal, not new checkout
  if (user.plan_status === 'active' || user.plan_status === 'past_due') {
    return json({
      error: 'You already have an active subscription. Manage it from settings.',
      should_use_portal: true,
    }, 409)
  }

  // 5. Ensure Stripe customer exists
  let customerId = user.stripe_customer_id

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: authUser.email ?? undefined,
        name: ((user.profile_data as Record<string, unknown> | null)?.name as string) ?? undefined,
        metadata: { user_id: user.id, auth_id: authUser.id },
      })
      customerId = customer.id

      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to persist stripe_customer_id:', updateError.message)
        // Don't fail the request — customer exists in Stripe, we'll catch up on webhook
      }
    } catch (err) {
      console.error('Stripe customer create failed:', (err as Error).message)
      return json({ error: 'Could not initialise payment account' }, 500)
    }
  }

  // 6. Create Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      success_url: `${APP_URL}/premium/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/premium`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
    })

    return json({ url: session.url, session_id: session.id })
  } catch (err) {
    console.error('Checkout session create failed:', (err as Error).message)
    return json({ error: 'Could not start checkout' }, 500)
  }
})
