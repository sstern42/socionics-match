// supabase/functions/discord-notify/index.ts
// Four webhook events via X-Webhook-Event header:
//   auth-signup       auth.users INSERT    → 🔔 New sign-up
//   profile-created   public.users INSERT  → ✅ Profile complete
//   match-created     matches INSERT       → 🤝 New connection with type pair
//   typing-request    typing_requests INSERT → 🧠 New typing request (private channel)

import { createClient } from 'npm:@supabase/supabase-js'

const DISCORD_WEBHOOK        = Deno.env.get('DISCORD_WEBHOOK_URL')!
const DISCORD_TYPING_WEBHOOK = Deno.env.get('DISCORD_TYPING_WEBHOOK_URL')!
const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY            = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-event',
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const maskedLocal = local.slice(0, 2) + '***'
  const [host, ...tld] = (domain ?? '').split('.')
  const maskedDomain = host.slice(0, 1) + '***.' + tld.join('.')
  return `${maskedLocal}@${maskedDomain}`
}

async function postToDiscord(content: string, webhookUrl: string = DISCORD_WEBHOOK) {
  return fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const event = req.headers.get('x-webhook-event') ?? 'profile-created'
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
    await postToDiscord(
      `🔔 **New sign-up** — ${email}\n` +
      `📊 ${members} members`
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

  } else {
    // profile-created
    const type    = record.type ?? '?'
    const purpose = (record.purpose ?? []).join(', ') || 'not set'
    const name    = record.profile_data?.name ?? 'Anonymous'
    const country = record.profile_data?.country ? ` · ${record.profile_data.country}` : ''

    await postToDiscord(
      `✅ **Profile complete** — ${name} · \`${type}\`${country}\n` +
      `Purpose: ${purpose} · 📊 ${members} members`
    )
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
