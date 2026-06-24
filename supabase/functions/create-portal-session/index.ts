// ============================================================================
// supabase/functions/create-portal-session/index.ts
// ============================================================================
// Called by the frontend when a subscribed user clicks "Manage subscription"
// in settings. Returns a Stripe Customer Portal URL for the React app to
// redirect to, where they can cancel, update payment method, view invoices etc.
//
// JWT verification SHOULD STAY ON for this function.
//
// Required env vars (Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY   (shared with other Stripe functions)
//   APP_URL             https://socion.app (or http://localhost:5173 for local dev)
//
// Auto-injected:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Frontend call pattern:
//   const { data: { session } } = await supabase.auth.getSession()
//   const res = await fetch(`${SUPABASE_URL}/functions/v1/create-portal-session`, {
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

  // 2. Look up stripe_customer_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (userError) {
    console.error('User lookup failed:', userError.message)
    return json({ error: 'User lookup failed' }, 500)
  }
  if (!user?.stripe_customer_id) {
    return json({
      error: 'No subscription to manage. Subscribe first to access the customer portal.',
    }, 404)
  }

  // 3. Create portal session
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${APP_URL}/settings`,
    })
    return json({ url: portalSession.url })
  } catch (err) {
    console.error('Portal session create failed:', (err as Error).message)
    return json({ error: 'Could not open customer portal' }, 500)
  }
})
