// supabase/functions/notify-reengagement/index.ts
// Called daily by pg_cron to re-engage members inactive for 3-7 days
// Sends once per inactivity window using reengagement_sent_at on push_subscriptions
// Secrets required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected

import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@socion.app'
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (_req) => {
  try {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Find members inactive for 3-7 days who have push subscriptions
    // and haven't been sent a re-engagement notification in the last 7 days
    const { data: candidates, error } = await supabase
      .from('users')
      .select(`
        id,
        type,
        profile_data,
        push_subscriptions!inner (
          subscription,
          reengagement_sent_at
        )
      `)
      .lt('last_active', threeDaysAgo)
      .gt('last_active', sevenDaysAgo)

    if (error) {
      console.error('Query error:', error)
      return new Response('Query error', { status: 500 })
    }

    if (!candidates?.length) {
      return new Response('No candidates', { status: 200 })
    }

    // Filter out those notified in the last 7 days
    const toNotify = candidates.filter(u => {
      const subs = u.push_subscriptions
      if (!subs?.length) return false
      const lastSent = subs[0].reengagement_sent_at
      if (!lastSent) return true
      const daysSinceSent = (now.getTime() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceSent >= 7
    })

    if (!toNotify.length) {
      return new Response('All recently notified', { status: 200 })
    }

    let sent = 0

    for (const user of toNotify) {
      const subscription = user.push_subscriptions[0]?.subscription
      if (!subscription) continue

      const payload = JSON.stringify({
        title: 'Anyone catch your eye?',
        body:  'New members have joined since your last visit — check who\'s on the feed.',
        url:   '/feed',
        tag:   'reengagement',
      })

      try {
        await webpush.sendNotification(subscription, payload)

        // Mark as sent
        await supabase
          .from('push_subscriptions')
          .update({ reengagement_sent_at: now.toISOString() })
          .eq('user_id', user.id)

        sent++
      } catch (err) {
        console.error(`Push failed for ${user.id}:`, err)
      }
    }

    return new Response(`Sent ${sent} re-engagement notifications`, { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 })
  }
})
