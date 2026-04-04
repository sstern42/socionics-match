// supabase/functions/notify-new-dual/index.ts
// Triggered by a Supabase database webhook on users INSERT
// Sends a push notification to all existing members whose Dual type matches the new member
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

// Socionics Dual pairs — bidirectional
const DUAL_MAP: Record<string, string> = {
  ILE: 'SEI', SEI: 'ILE',
  ESE: 'LII', LII: 'ESE',
  EIE: 'LSI', LSI: 'EIE',
  SLE: 'IEI', IEI: 'SLE',
  SEE: 'ILI', ILI: 'SEE',
  LIE: 'ESI', ESI: 'LIE',
  LSE: 'EII', EII: 'LSE',
  IEE: 'SLI', SLI: 'IEE',
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const record = body.record

    if (!record) return new Response('No record', { status: 400 })

    const newUserId = record.id
    const newType   = record.type

    if (!newType || !DUAL_MAP[newType]) {
      return new Response('Type not recognised or has no Dual', { status: 200 })
    }

    const dualType = DUAL_MAP[newType]

    // Find all existing members of the Dual type (excluding the new user)
    const { data: dualMembers, error } = await supabase
      .from('users')
      .select('id, profile_data')
      .eq('type', dualType)
      .neq('id', newUserId)

    if (error || !dualMembers?.length) {
      return new Response('No Dual members found', { status: 200 })
    }

    const memberIds = dualMembers.map(m => m.id)

    // Get push subscriptions for those members
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', memberIds)

    if (!subscriptions?.length) {
      return new Response('No subscriptions', { status: 200 })
    }

    // Determine new user display name — respect anonymous mode
    const isAnon = record.profile_data?.anonymous === true
    const newName = isAnon ? `A new ${newType}` : (record.profile_data?.name ? `${record.profile_data.name} (${newType})` : `A new ${newType}`)

    const payload = JSON.stringify({
      title: 'Your Dual just joined',
      body:  `${newName} is now on Socion — your ideal dynamic.`,
      url:   '/feed',
      tag:   `new-dual-${newUserId}`,
    })

    // Send to all Dual members with subscriptions
    const sends = subscriptions.map(async ({ subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload)
      } catch (err) {
        console.error('Push failed:', err)
      }
    })

    await Promise.allSettled(sends)

    return new Response(`Notified ${subscriptions.length} members`, { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Error', { status: 500 })
  }
})
