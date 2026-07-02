// ============================================================================
// supabase/functions/onboarding-typing-confirm/index.ts
// ============================================================================
// Issue #866 — the sole writer to users.type for the onboarding typing chat.
// Called by the frontend once the user's final type is known: immediately
// after onboarding-typing-analyse for the normal (non-lean) case, or after
// the user picks between the two lean-choice candidates.
//
// In:  { type: string, confidence: number }
//      user_id resolved from the caller's own JWT, same as
//      onboarding-typing-analyse.
// Out: { applied: boolean }
//      applied: false means the user's existing paid_verified/
//      community_verified type was correctly left untouched
//      (apply_onboarding_type() refuses the overwrite) — not an error.
//
// Required env vars: none beyond the auto-injected Supabase ones.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_TYPES = [
  'ILE', 'LII', 'ESE', 'SEI', 'EIE', 'LSI', 'SLE', 'IEI',
  'SEE', 'ESI', 'LIE', 'ILI', 'IEE', 'EII', 'LSE', 'SLI',
]

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { type, confidence } = await req.json()

    if (typeof type !== 'string' || !VALID_TYPES.includes(type)) {
      return json({ error: 'Invalid type' }, 400)
    }
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      return json({ error: 'Invalid confidence' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('PROJECT_SECRET_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      return json({ error: 'Unauthorised.' }, 401)
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (userError || !userRow) {
      return json({ error: 'User not found.' }, 404)
    }

    const { data: applied, error: applyError } = await supabase.rpc('apply_onboarding_type', {
      p_user_id: userRow.id,
      p_type: type,
      p_confidence: confidence,
    })

    if (applyError) {
      console.error('apply_onboarding_type error:', applyError)
      return json({ error: 'Something went wrong — please try again.' }, 500)
    }

    return json({ applied: !!applied })
  } catch (err) {
    console.error('onboarding-typing-confirm error:', err)
    return json({ error: (err as Error).message ?? 'Something went wrong.' }, 500)
  }
})
