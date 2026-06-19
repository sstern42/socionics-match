// supabase/functions/send-room-push/index.ts
//
// Triggered by a Supabase DB webhook on room_messages INSERT.
// Sends push notifications to eligible room members:
//   - In the same quadra room
//   - Not the sender
//   - Has push subscription
//   - Has room_notifications enabled in profile_data
//   - Has not received a room push in the last 5 minutes (per device)
//
// Notification format:
//   Title: "Spencer (Alpha)"
//   Body:  message preview (80 chars)
//   URL:   /rooms
//   Tag:   room-{roomId}  ← new messages replace old for same room
//
// Required env vars (auto-injected by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Required secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@socion.app'
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const DEBOUNCE_MS = 5 * 60 * 1000 // 5 minutes

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const record = body.record

    if (!record) return new Response('No record', { status: 400 })

    const { id: messageId, room_id: roomId, sender_id: senderId, content } = record

    if (!roomId || !senderId || !content) {
      return new Response('Missing fields', { status: 200 })
    }

    // 1. Get the room's quadra (or global flag) for the notification title
    const { data: room } = await supabase
      .from('rooms')
      .select('quadra, is_global')
      .eq('id', roomId)
      .single()

    const quadraLabel = room?.is_global ? 'Socion' : room?.quadra ? capitalize(room.quadra) : 'Quadra'

    // 2. Get sender's display name (respect anonymous mode)
    const { data: sender } = await supabase
      .from('users')
      .select('type, profile_data')
      .eq('id', senderId)
      .single()

    const isAnon      = sender?.profile_data?.anonymous === true
    const senderName  = isAnon
      ? 'Anonymous'
      : (sender?.profile_data?.name ?? sender?.type ?? 'Someone')

    // 3. Find eligible users: not sender, room_notifications on, and either
    //    assigned to this quadra room OR this is the global Socion room
    //    (which every user can read/post in regardless of their room_id)
    let eligibleQuery = supabase
      .from('users')
      .select('auth_id')
      .neq('id', senderId)
      .filter('profile_data->>room_notifications', 'eq', 'true')

    eligibleQuery = room?.is_global
      ? eligibleQuery.not('room_id', 'is', null)
      : eligibleQuery.eq('room_id', roomId)

    const { data: eligibleUsers } = await eligibleQuery

    if (!eligibleUsers?.length) {
      return new Response('No eligible users', { status: 200 })
    }

    const authIds = eligibleUsers.map(u => u.auth_id).filter(Boolean)

    // 4. Get push subscriptions for those users, with debounce timestamp
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription, last_room_push_at')
      .in('user_id', authIds)

    if (!subscriptions?.length) {
      return new Response('No subscriptions', { status: 200 })
    }

    const now         = Date.now()
    const bodyPreview = content.length > 80 ? content.slice(0, 80) + '…' : content

    const payload = JSON.stringify({
      title: `${senderName} (${quadraLabel})`,
      body:  bodyPreview,
      url:   '/rooms',
      tag:   `room-${roomId}`,  // replaces previous room notification on device
    })

    let sent = 0

    for (const sub of subscriptions) {
      // Debounce check — skip if notified within last 5 minutes
      if (sub.last_room_push_at) {
        const lastSent = new Date(sub.last_room_push_at).getTime()
        if (now - lastSent < DEBOUNCE_MS) continue
      }

      try {
        await webpush.sendNotification(sub.subscription, payload)

        // Update debounce timestamp
        await supabase
          .from('push_subscriptions')
          .update({ last_room_push_at: new Date().toISOString() })
          .eq('user_id', sub.user_id)

        sent++
      } catch (err) {
        console.error(`Push failed for ${sub.user_id}:`, err)
        // Stale/revoked subscription — clean up
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', sub.user_id)
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 })
  }
})
