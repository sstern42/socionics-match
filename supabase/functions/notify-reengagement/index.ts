// supabase/functions/notify-reengagement/index.ts
// Called daily by pg_cron to re-engage members inactive for 3-7 days
// Sends once per inactivity window using reengagement_sent_at on push_subscriptions
// Secrets required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected

import webpush from 'npm:web-push'
import { createClient } from 'npm:@supabase/supabase-js'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@socion.app'
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (_req) => {
  try {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Step 1 — find inactive users in the 3-7 day window
    const { data: inactiveUsers, error: usersError } = await supabase
      .from('users')
      .select('id, auth_id')
      .lt('last_active', threeDaysAgo)
      .gt('last_active', sevenDaysAgo)

    if (usersError) {
      console.error('Users query error:', usersError)
      return new Response(`Query error: ${usersError.message}`, { status: 500 })
    }

    if (!inactiveUsers?.length) {
      return new Response('No inactive candidates', { status: 200 })
    }

    const authIds = inactiveUsers.map(u => u.auth_id).filter(Boolean)

    // Step 2 — get push subscriptions for those users
    // exclude those notified in the last 7 days
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription, reengagement_sent_at')
      .in('user_id', authIds)
      .or(`reengagement_sent_at.is.null,reengagement_sent_at.lt.${sevenDaysAgo}`)

    if (subsError) {
      console.error('Subscriptions query error:', subsError)
      return new Response(`Subscriptions error: ${subsError.message}`, { status: 500 })
    }

    if (!subscriptions?.length) {
      return new Response('No subscriptions or all recently notified', { status: 200 })
    }

    let sent = 0

    for (const sub of subscriptions) {
      const payload = JSON.stringify({
        title: 'Anyone catch your eye?',
        body:  "New members have joined since your last visit — check who's on the feed.",
        url:   '/feed',
        tag:   'reengagement',
      })

      try {
        await webpush.sendNotification(sub.subscription, payload)

        await supabase
          .from('push_subscriptions')
          .update({ reengagement_sent_at: now.toISOString() })
          .eq('user_id', sub.user_id)

        sent++
      } catch (err) {
        console.error(`Push failed for ${sub.user_id}:`, err)
      }
    }

    return new Response(`Sent ${sent} re-engagement notifications`, { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(`Error: ${err}`, { status: 500 })
  }
})
