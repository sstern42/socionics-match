// supabase/functions/discord-notify/index.ts
// Six webhook events via X-Webhook-Event header:
//   auth-signup             auth.users INSERT             → 🔔 New sign-up
//   profile-created         public.users INSERT           → ✅ Profile complete
//   match-created           matches INSERT                → 🤝 New connection with type pair
//   typing-request          typing_requests INSERT        → 🧠 New typing request (private channel, unused)
//   feedback-created        feedback INSERT                → 📮 New feedback/bug report (private channel)
//   typing-checkout-clicked typing_checkout_clicks INSERT  → 💳 Typing tier "Book" clicked (private channel)

import { createClient } from 'npm:@supabase/supabase-js'

const DISCORD_WEBHOOK          = Deno.env.get('DISCORD_WEBHOOK_URL')!
const DISCORD_TYPING_WEBHOOK   = Deno.env.get('DISCORD_TYPING_WEBHOOK_URL')!
const DISCORD_FEEDBACK_WEBHOOK = Deno.env.get('DISCORD_FEEDBACK_WEBHOOK_URL')!
const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY              = Deno.env.get('PROJECT_SECRET_KEY')!

const KNOWN_EVENTS = new Set([
  'auth-signup', 'profile-created', 'match-created', 'typing-request', 'feedback-created',
  'typing-checkout-clicked',
])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-event, x-webhook-secret',
}

// signup_device is a stable key set client-side (src/lib/device.js) and
// carried into auth.users.raw_user_meta_data. Map it to a friendly label.
// Google sign-in and other flows that don't set it fall back to null.
const DEVICE_LABELS: Record<string, string> = {
  ios:     '📱 Mobile (iOS)',
  android: '📱 Mobile (Android)',
  mac:     '💻 Desktop (macOS)',
  windows: '💻 Desktop (Windows)',
  linux:   '💻 Desktop (Linux)',
  other:   '🖥️ Other device',
}

function deviceLabel(record: Record<string, unknown>): string | null {
  const meta = record.raw_user_meta_data as Record<string, unknown> | undefined
  const key = typeof meta?.signup_device === 'string' ? meta.signup_device : null
  if (!key) return null
  return DEVICE_LABELS[key] ?? `🖥️ ${key}`
}

// The auth provider lives on auth.users.raw_app_meta_data.provider — 'email'
// for the magic-code (OTP) flow, 'google' for Google sign-in — so no client
// change is needed to surface it.
const PROVIDER_LABELS: Record<string, string> = {
  email:  '✉️ Magic code',
  google: '🔵 Google',
}

function authMethod(record: Record<string, unknown>): string | null {
  const meta = record.raw_app_meta_data as Record<string, unknown> | undefined
  const provider = typeof meta?.provider === 'string' ? meta.provider : null
  if (!provider) return null
  return PROVIDER_LABELS[provider] ?? `🔑 ${provider}`
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const maskedLocal = local.slice(0, 2) + '***'
  const [host, ...tld] = (domain ?? '').split('.')
  const maskedDomain = host.slice(0, 1) + '***.' + tld.join('.')
  return `${maskedLocal}@${maskedDomain}`
}

async function postToDiscord(content: string, webhookUrl: string = DISCORD_WEBHOOK) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    console.error(`Discord webhook post failed: ${res.status} ${await res.text()}`)
  }
  return res
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only this project's own database webhooks should be able to trigger this
  // function. Deliberately not using the standard Authorization header here —
  // the Supabase dashboard's webhook editor treats that header specially and
  // keeps reverting it to the project's legacy service_role JWT, which no
  // longer matches PROJECT_SECRET_KEY. A custom header sidesteps that.
  if (req.headers.get('x-webhook-secret') !== SERVICE_KEY) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const event = req.headers.get('x-webhook-event') ?? 'profile-created'

  if (!KNOWN_EVENTS.has(event)) {
    return new Response(`Unrecognized event: ${event}`, { status: 400, headers: corsHeaders })
  }

  const body = await req.json()
  const record = body.record

  if (!record) {
    return new Response('No record', { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Member count for all events
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
  const members = count ?? 0

  if (event === 'auth-signup') {
    const email = record.email ? `\`${maskEmail(record.email)}\`` : 'unknown'
    // members counts completed profiles (public.users), which this brand-new
    // auth.users signup isn't yet — so frame it as one more on the way.
    const parts = [authMethod(record), deviceLabel(record), `📊 ${members} members +1`].filter(Boolean)
    await postToDiscord(
      `🔔 **New sign-up** — ${email}\n` +
      parts.join(' · ')
    )

  } else if (event === 'match-created') {
    const relation = record.relation_type ?? '?'
    const purpose  = record.purpose ?? 'dating'

    const { data: users } = await supabase
      .from('users')
      .select('id, type')
      .in('id', [record.user_a_id, record.user_b_id])

    const typeA = users?.find(u => u.id === record.user_a_id)?.type ?? '?'
    const typeB = users?.find(u => u.id === record.user_b_id)?.type ?? '?'

    await postToDiscord(
      `🤝 **New connection** · \`${relation}\` · ${typeA} × ${typeB} · ${purpose}\n` +
      `📊 ${members} members`
    )

  } else if (event === 'typing-request') {
    // Look up the requesting user's type and name
    const { data: user } = await supabase
      .from('users')
      .select('type, profile_data')
      .eq('id', record.user_id)
      .maybeSingle()

    const type    = user?.type ?? '?'
    const name    = user?.profile_data?.name ?? 'Anonymous'
    const discord = record.discord_handle ? `\n💬 ${record.discord_handle}` : ''
    const notes   = record.notes ? `\n📝 "${record.notes}"` : ''

    await postToDiscord(
      `🧠 **New typing request** — ${name} · \`${type}\`${discord}${notes}`,
      DISCORD_TYPING_WEBHOOK
    )

  } else if (event === 'feedback-created') {
    // record: { user_id, type: 'feedback'|'bug', message, page_url, user_type }
    const { data: user } = record.user_id
      ? await supabase
          .from('users')
          .select('profile_data')
          .eq('id', record.user_id)
          .maybeSingle()
      : { data: null }

    const name  = user?.profile_data?.name ?? 'Anonymous'
    const kind  = record.type === 'bug' ? '🐛 Bug report' : '💬 Feedback'
    const type  = record.user_type ?? '?'
    const page  = record.page_url ? `\n📍 ${record.page_url}` : ''
    const msg   = record.message ? `\n📝 "${record.message}"` : ''

    await postToDiscord(
      `${kind} — ${name} · \`${type}\`${page}${msg}`,
      DISCORD_FEEDBACK_WEBHOOK
    )

  } else if (event === 'typing-checkout-clicked') {
    // record: { user_id, typist_slug, tier_key, tier_price }
    const { data: user } = await supabase
      .from('users')
      .select('type, profile_data')
      .eq('id', record.user_id)
      .maybeSingle()

    const type  = user?.type ?? '?'
    const name  = user?.profile_data?.name ?? 'Anonymous'
    const price = record.tier_price ? ` · ${record.tier_price}` : ''

    await postToDiscord(
      `💳 **Typing checkout clicked** — ${name} · \`${type}\` → ${record.typist_slug} (${record.tier_key})${price}`,
      DISCORD_TYPING_WEBHOOK
    )

  } else {
    // profile-created
    // Respect anonymous mode (profile_data.anonymous) the same way
    // notify-new-dual and send-room-push do — don't leak a name/country the
    // user chose to hide. The 🕶️ marker distinguishes a deliberate anon user
    // from one who simply never set a name.
    const type    = record.type ?? '?'
    const purpose = (record.purpose ?? []).join(', ') || 'not set'
    const isAnon  = record.profile_data?.anonymous === true
    const name    = isAnon ? '🕶️ Anonymous' : (record.profile_data?.name ?? 'Anonymous')
    const country = (!isAnon && record.profile_data?.country) ? ` · ${record.profile_data.country}` : ''

    await postToDiscord(
      `✅ **Profile complete** — ${name} · \`${type}\`${country}\n` +
      `Purpose: ${purpose} · 📊 We now have ${members} members`
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
