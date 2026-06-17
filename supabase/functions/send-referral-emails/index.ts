// ============================================================================
// supabase/functions/send-referral-emails/index.ts
// ============================================================================
// Called by the client right after grant_referral_reward() succeeds (see
// src/lib/referral.js attributeAndRewardReferral). Sends two emails:
//   - to the referee: welcome + 7-day trial unlocked
//   - to the referrer: reward earned (days granted), or a tier-up
//     acknowledgement if they're already premium and no days were granted
//
// No-ops quietly if the referee has no 'qualified' referrals row — this lets
// the client call it unconditionally after every signup, referred or not.
//
// JWT verification SHOULD STAY ON for this function. The caller must be the
// referee themselves (checked below), not just any authenticated user.
//
// Required env vars (shared with other functions):
//   RESEND_API_KEY
// Auto-injected:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Frontend call pattern: see src/lib/referral.js sendReferralEmails()
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'
import { Resend } from 'https://esm.sh/resend@4.0.0?target=denonext'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

async function sendEmailSafe(args: { to: string; subject: string; html: string }): Promise<void> {
  try {
    await resend.emails.send({ from: RESEND_FROM, ...args })
  } catch (err) {
    console.error('Resend send failed:', (err as Error).message)
  }
}

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.5;">
${body}
<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;">
<p style="color: #666; font-size: 13px; margin: 0;">Socion · <a href="https://socion.app" style="color: #666;">socion.app</a></p>
</body></html>`
}

function emailRefereeWelcome(name: string | null, referrerName: string | null): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return emailShell(`
<h2 style="margin-top: 0;">Welcome to Socion${referrerName ? ` — ${referrerName} invited you` : ''}</h2>
<p>${greeting}</p>
<p>Thanks for finishing your profile. You've unlocked <strong>7 days of Socion Premium</strong> — unlimited connections, every relation type in your feed, and full compatibility breakdowns.</p>
<p><a href="https://socion.app/feed" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">Open Socion</a></p>
`)
}

function emailReferrerRewardEarned(name: string | null, days: number): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return emailShell(`
<h2 style="margin-top: 0;">🎉 You earned ${days} days of Premium</h2>
<p>${greeting}</p>
<p>Someone you invited just finished setting up their Socion profile — your referral reward is now active.</p>
<p><a href="https://socion.app/settings" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">See your invite stats</a></p>
`)
}

function emailReferrerTierUp(name: string | null, tier: string | null, count: number): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const tierLabel = tier ? TIER_LABELS[tier] ?? tier : null
  return emailShell(`
<h2 style="margin-top: 0;">🎉 Another successful referral${tierLabel ? ` — you're a ${tierLabel} now` : ''}</h2>
<p>${greeting}</p>
<p>Someone you invited just finished setting up their Socion profile. That's ${count} qualifying ${count === 1 ? 'referral' : 'referrals'} so far.</p>
<p><a href="https://socion.app/settings" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 8px;">See your invite stats</a></p>
`)
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
      subject: 'Welcome to Socion — your 7-day trial is active',
      html: emailRefereeWelcome(refereeContact.name, referrerContact?.name ?? null),
    })
  }

  if (referrerContact) {
    if (referral.reward_days_granted > 0) {
      await sendEmailSafe({
        to: referrerContact.email,
        subject: `You earned ${referral.reward_days_granted} days of Premium`,
        html: emailReferrerRewardEarned(referrerContact.name, referral.reward_days_granted),
      })
    } else {
      const { data: referrerRow } = await supabase
        .from('users')
        .select('referral_count_qualified')
        .eq('id', referral.referrer_id)
        .maybeSingle()
      const { data: tier } = await supabase.rpc('referral_tier', { p_user_id: referral.referrer_id })
      await sendEmailSafe({
        to: referrerContact.email,
        subject: 'Another successful referral',
        html: emailReferrerTierUp(referrerContact.name, tier, referrerRow?.referral_count_qualified ?? 0),
      })
    }
  }

  return json({ ok: true })
})
