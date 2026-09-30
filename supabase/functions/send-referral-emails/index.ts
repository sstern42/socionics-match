// ============================================================================
// supabase/functions/send-referral-emails/index.ts
// ============================================================================
// Called by the client right after grant_referral_reward() succeeds (see
// src/lib/referral.js attributeAndRewardReferral). Sends two emails:
//   - to the referee: welcome + 7-day trial unlocked
//   - to the referrer: reward earned (days granted), or a tier-up
//     acknowledgement if they're already premium and no days were granted
//
// Classification (see ../_shared/email.ts):
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
//   UNSUBSCRIBE_SECRET  (tier-up email only; see ../_shared/email.ts)
// Auto-injected:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Frontend call pattern: see src/lib/referral.js sendReferralEmails()
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0?target=denonext'
import { Resend } from 'https://esm.sh/resend@4.0.0?target=denonext'
import { listUnsubscribeHeaders, nonTransactionalFooter, transactionalFooter } from '../_shared/email.ts'

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
