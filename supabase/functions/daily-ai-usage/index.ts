// supabase/functions/daily-ai-usage/index.ts
// Scheduled once per day (pg_cron, see stats.sql) — posts total AI chat
// messages sent via the Anthropic API today to a Discord webhook.

import { createClient } from 'npm:@supabase/supabase-js'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DISCORD_STATS_WEBHOOK_URL = Deno.env.get('DISCORD_STATS_WEBHOOK_URL')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const { data: rows, error } = await supabase
    .from('ai_message_counts')
    .select('count')
    .eq('date', today)

  if (error) {
    console.error('daily-ai-usage query error:', error)
    return new Response('Query failed', { status: 500 })
  }

  const total = (rows ?? []).reduce((sum, r) => sum + (r.count ?? 0), 0)
  const activeUsers = (rows ?? []).length

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const res = await fetch(DISCORD_STATS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content:
        `📈 **AI chat usage — ${dateLabel}**\n` +
        `💬 ${total} message${total === 1 ? '' : 's'} sent via the API\n` +
        `👤 ${activeUsers} active user${activeUsers === 1 ? '' : 's'}`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Discord webhook error:', err)
    return new Response('Discord post failed', { status: 500 })
  }

  return new Response(JSON.stringify({ sent: true, total, activeUsers }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
