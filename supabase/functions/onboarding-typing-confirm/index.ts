// ============================================================================
// supabase/functions/onboarding-typing-confirm/index.ts
// ============================================================================
// Issue #866 — the sole writer to users.type for the onboarding typing chat.
// Called by the frontend once the user's final type is known: immediately
// after onboarding-typing-analyse for the normal (non-lean) case, or after
// the user picks between the two lean-choice candidates.
//
// In:  { type: string, confidence: number, source?: 'signup'|'retake',
//        lean_choice?: boolean }
//      user_id resolved from the caller's own JWT, same as
//      onboarding-typing-analyse. `source` and `lean_choice` are only used to
//      shape the live-stats Discord notification (see notifyLiveStats) — they
//      have no bearing on which type is written.
// Out: { applied: boolean }
//      applied: false means the user's existing paid_verified/
//      community_verified type was correctly left untouched
//      (apply_onboarding_type() refuses the overwrite) — not an error.
//
// Required env vars: none beyond the auto-injected Supabase ones.
//   Optional: fires a best-effort notification to the discord-notify function
//   (same PROJECT_SECRET_KEY / SUPABASE_URL already in scope); a failure there
//   is logged and swallowed so it can never fail the user's confirm.
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

// Best-effort live-stats ping. Hands the raw facts to the discord-notify
// function (which owns all Discord message formatting and the member-count
// lookup, same as every other event) via the same custom x-webhook-secret
// header its database webhooks use. Never throws: a Discord outage must not
// fail a user's type confirmation.
async function notifyLiveStats(record: Record<string, unknown>): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL')
  const secret = Deno.env.get('PROJECT_SECRET_KEY')
  if (!url || !secret) return
  try {
    const res = await fetch(`${url}/functions/v1/discord-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-event': 'typing-chat-completed',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify({ record }),
    })
    if (!res.ok) {
      console.error(`discord-notify ping failed: ${res.status} ${await res.text()}`)
    }
  } catch (err) {
    console.error('discord-notify ping error:', err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { type, confidence, source, lean_choice } = await req.json()

    if (typeof type !== 'string' || !VALID_TYPES.includes(type)) {
      return json({ error: 'Invalid type' }, 400)
    }
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      return json({ error: 'Invalid confidence' }, 400)
    }
    // Only used for the live-stats notification, so a bad/missing value just
    // falls back to the safer default rather than rejecting the confirm.
    const notifySource = source === 'signup' ? 'signup' : 'retake'
    const leanChoice = lean_choice === true

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

    // Read the type as it stands *before* the apply so the notification can
    // say "reconfirmed X" vs "X → Y" — apply_onboarding_type overwrites it in
    // place, so there's no reading it back afterwards.
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, type')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (userError || !userRow) {
      return json({ error: 'User not found.' }, 404)
    }

    const previousType = userRow.type ?? null

    const { data: applied, error: applyError } = await supabase.rpc('apply_onboarding_type', {
      p_user_id: userRow.id,
      p_type: type,
      p_confidence: confidence,
    })

    if (applyError) {
      console.error('apply_onboarding_type error:', applyError)
      return json({ error: 'Something went wrong — please try again.' }, 500)
    }

    // Fire-and-forget: the confirm succeeds regardless of the ping's fate.
    await notifyLiveStats({
      user_id: userRow.id,
      source: notifySource,
      applied: !!applied,
      new_type: type,
      previous_type: previousType,
      confidence,
      requires_lean_choice: leanChoice,
    })

    return json({ applied: !!applied })
  } catch (err) {
    console.error('onboarding-typing-confirm error:', err)
    return json({ error: (err as Error).message ?? 'Something went wrong.' }, 500)
  }
})
