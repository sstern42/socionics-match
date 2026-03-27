import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const DIGEST_TO = Deno.env.get('DIGEST_TO') ?? 'spencer.stern@gmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get current member count
  const { count: currentMembers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })

  const total = currentMembers ?? 0

  // Get yesterday's count from stats table
  const { data: statsRow } = await supabase
    .from('stats')
    .select('members_yesterday')
    .eq('id', 1)
    .single()

  const yesterday = statsRow?.members_yesterday ?? total
  const delta = total - yesterday
  const deltaStr = delta > 0 ? `+${delta}` : delta === 0 ? '—' : `${delta}`
  const deltaColour = delta > 0 ? '#4caf50' : delta < 0 ? '#e53935' : '#888'

  // Build email HTML
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const html = `
<!DOCTYPE html>
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
            <p style="margin:4px 0 0;font-size:12px;color:#9a8a6a;letter-spacing:0.08em;text-transform:uppercase;font-family:sans-serif">Daily digest · ${today}</p>
          </td>
        </tr>

        <!-- Stat -->
        <tr>
          <td style="padding:40px 32px;text-align:center">
            <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-family:sans-serif">Members</p>
            <p style="margin:12px 0 0;font-size:64px;font-family:Georgia,serif;color:#1a1814;line-height:1">${total}</p>
            <p style="margin:8px 0 0;font-size:18px;color:${deltaColour};font-family:sans-serif;font-weight:500">${deltaStr} since yesterday</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px"><div style="height:1px;background:#ddd8ce"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;text-align:center">
            <a href="https://socion.app/admin" style="font-size:12px;color:#9a6f38;text-decoration:none;font-family:sans-serif;letter-spacing:0.06em">
              Open admin dashboard →
            </a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  // Send via Resend
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Socion <hello@socion.app>',
      to: [DIGEST_TO],
      subject: `Socion · ${total} members · ${deltaStr} today`,
      html,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    console.error('Resend error:', err)
    return new Response('Email failed', { status: 500 })
  }

  // Update members_yesterday for next run
  await supabase
    .from('stats')
    .update({ members_yesterday: total })
    .eq('id', 1)

  return new Response(JSON.stringify({ sent: true, total, delta }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
