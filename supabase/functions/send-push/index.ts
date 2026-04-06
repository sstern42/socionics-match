// supabase/functions/send-push/index.ts
// Triggered by a Supabase database webhook on messages INSERT
// Secrets required (set via Supabase dashboard > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)

import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@socion.app'
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  console.log('send-push invoked', req.method)
  try {
    const body = await req.json()
    console.log('body:', JSON.stringify(body).slice(0, 200))
    const record = body.record

    if (!record) return new Response('No record', { status: 400 })

    const { match_id, sender_id, content } = record

    // Find the other user in this match
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('user_a_id, user_b_id')
      .eq('id', match_id)
      .single()

    if (matchErr || !match) return new Response('Match not found', { status: 200 })
    console.log('match found:', match.user_a_id, match.user_b_id)

    const recipient_internal_id = match.user_a_id === sender_id
      ? match.user_b_id
      : match.user_a_id
    console.log('recipient_internal_id:', recipient_internal_id)

    // Get recipient's auth_id for push subscription lookup
    const { data: recipient } = await supabase
      .from('users')
      .select('auth_id, profile_data')
      .eq('id', recipient_internal_id)
      .single()
    console.log('recipient auth_id:', recipient?.auth_id)

    if (!recipient?.auth_id) return new Response('Recipient not found', { status: 200 })

    const recipient_id = recipient.auth_id

    // Get sender profile for notification title
    const { data: sender } = await supabase
      .from('users')
      .select('type, profile_data')
      .eq('id', sender_id)
      .single()
    console.log('sender:', sender?.type)

    const senderName  = sender?.profile_data?.name ?? sender?.type ?? 'Someone'
    const bodyText    = content.length > 80 ? content.slice(0, 80) + '…' : content

    // Get all push subscriptions for recipient (multi-device)
    const { data: rows } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', recipient_id)
    console.log('subscription rows:', rows?.length ?? 0)

    if (!rows?.length) return new Response('No subscription', { status: 200 })

    const payload = JSON.stringify({
      title: senderName,
      body:  bodyText,
      url:   `/messages?match=${match_id}`,
      tag:   `message-${match_id}`,
    })

    await Promise.allSettled(rows.map(row => webpush.sendNotification(row.subscription, payload)))

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 })
  }
})
