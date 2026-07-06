// supabase/functions/notify-abandoned-signup/index.ts
// Issue #964 — nudge users who authenticated but never finished their profile.
//
// Called daily by pg_cron (see 20260706120000_abandoned_signup_nudge.sql).
// Finds auth.users older than a threshold with no matching public.users row
// (i.e. they started signup but never completed ProfileSetup.jsx / createProfile)
// and sends a single "finish setting up your profile" transactional email via
// Resend, linking back to /profile/setup.
//
// One-time per user: claim_abandoned_signup_nudge() records the send and only
// lets one (concurrent/retried) invocation actually claim each candidate. On a
// Resend failure we release the claim so the next daily run retries it.
//
// Auth: same x-cron-secret pattern as daily-digest / seed-room-prompt — the
// Supabase dashboard keeps reverting the standard Authorization header to the
// legacy service_role JWT, so a custom header sidesteps that and stays testable
// from the function GUI.
//
// Required env vars (shared with other functions):
//   RESEND_API_KEY
// Auto-injected:
//   SUPABASE_URL
// Set as a secret (same as the other functions here):
//   PROJECT_SECRET_KEY  (service role key)
//
// Optional JSON body overrides (for testing / one-off sends):
//   { "olderThanHours": 24, "newerThanDays": 30, "limit": 200, "dryRun": true }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('PROJECT_SECRET_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM = 'Socion <noreply@mail.socion.app>'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-cron-secret',
}

function nudgeEmailHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f7f4ef;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd8ce;border-radius:6px;overflow:hidden">

        <!-- Header -->
        <tr>
          <td style="background:#1a1814;padding:24px 32px">
            <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:#fff;letter-spacing:0.02em">Socion</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9a8a6a;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">You're one step away</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 8px">
            <p style="margin:0 0 16px;font-size:20px;font-family:Georgia,serif;color:#1a1814;line-height:1.3">Finish setting up your profile</p>
            <p style="margin:0 0 16px;font-size:15px;color:#3a352c;font-family:sans-serif;line-height:1.6">
              You signed up for Socion but didn't finish your profile — so you're not on the feed yet, and other members can't find you.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#3a352c;font-family:sans-serif;line-height:1.6">
              It only takes a couple of minutes to add a photo and a short bio. Once you're done, you'll start seeing the people whose Socionics type fits yours.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 36px;text-align:center">
            <a href="https://socion.app/profile/setup"
               style="display:inline-block;background:#1a1814;color:#fff;font-family:sans-serif;font-size:15px;text-decoration:none;padding:12px 28px;border-radius:5px;letter-spacing:0.02em">
              Finish your profile →
            </a>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px"><div style="height:1px;background:#ddd8ce"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9a8a6a;font-family:sans-serif;line-height:1.6">
              Socion · <a href="https://socion.app" style="color:#9a6f38;text-decoration:none">socion.app</a><br>
              You're getting this because you started creating a Socion account.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendNudge(to: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject: 'Finish setting up your Socion profile',
        html: nudgeEmailHtml(),
      }),
    })
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('Resend send failed:', (err as Error).message)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only this project's own cron job should be able to trigger this function.
  if (req.headers.get('x-cron-secret') !== SERVICE_KEY) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  // Optional overrides (testing / one-off sends). Body is optional.
  let olderThanHours = 24
  let newerThanDays = 30
  let limit = 200
  let dryRun = false
  try {
    const body = await req.json()
    if (typeof body?.olderThanHours === 'number') olderThanHours = body.olderThanHours
    if (typeof body?.newerThanDays === 'number') newerThanDays = body.newerThanDays
    if (typeof body?.limit === 'number') limit = body.limit
    if (body?.dryRun === true) dryRun = true
  } catch {
    // no body — use defaults
  }

  const { data: candidates, error } = await supabase.rpc('get_abandoned_signups', {
    p_older_than: `${olderThanHours} hours`,
    p_newer_than: `${newerThanDays} days`,
    p_limit: limit,
  })

  if (error) {
    console.error('get_abandoned_signups error:', error)
    return new Response(`Query error: ${error.message}`, { status: 500, headers: corsHeaders })
  }

  if (!candidates?.length) {
    return new Response(
      JSON.stringify({ candidates: 0, sent: 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({ dryRun: true, candidates: candidates.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let sent = 0
  for (const c of candidates as Array<{ auth_id: string; email: string }>) {
    // Claim before sending — only proceed if we won the claim, so a
    // retried/concurrent run can't double-send.
    const { data: claimed, error: claimErr } = await supabase.rpc(
      'claim_abandoned_signup_nudge',
      { p_auth_id: c.auth_id },
    )
    if (claimErr) {
      console.error(`Claim failed for ${c.auth_id}:`, claimErr)
      continue
    }
    if (claimed !== true) continue // lost the claim race — already nudged

    const ok = await sendNudge(c.email)
    if (ok) {
      sent++
    } else {
      // Release the claim so the next daily run retries this user.
      await supabase.from('abandoned_signup_nudges').delete().eq('auth_id', c.auth_id)
    }
  }

  return new Response(
    JSON.stringify({ candidates: candidates.length, sent }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
