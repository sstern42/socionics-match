// supabase/functions/delete-account/index.ts
// Deletes the calling user's account — all data cascades from auth.users.
// Secrets required:
//   SUPABASE_URL          (auto-injected)
//   PROJECT_SECRET_KEY    service role key (same as the other functions)
// Secret (optional — without it the MailerLite step is skipped and logged):
//   MAILERLITE_API_KEY   MailerLite API token (Integrations → API)
//
// After a successful deletion, the member is also deleted from MailerLite
// (the privacy policy promises this). That step is best-effort: it runs only
// once the account is gone, "subscriber not found" counts as success, and any
// failure is logged and never changes the response. email_suppressions is
// deliberately untouched — it's keyed by address with no FK to the account,
// so an unsubscribe keeps being honoured after deletion.

import { createClient } from 'npm:@supabase/supabase-js'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('PROJECT_SECRET_KEY')!
const MAILERLITE_API_KEY = Deno.env.get('MAILERLITE_API_KEY')

const MAILERLITE_API = 'https://connect.mailerlite.com/api'
const MAILERLITE_TIMEOUT_MS = 8000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

// Remove the subscriber from MailerLite. The delete endpoint takes a
// subscriber id, so look the id up by email first. 404 at either step means
// they were never (or are no longer) subscribed, which is the goal. Never
// throws: every failure is logged and swallowed.
async function removeFromMailerLite(email: string): Promise<void> {
  if (!MAILERLITE_API_KEY) {
    console.error('MailerLite removal skipped: MAILERLITE_API_KEY is not set')
    return
  }
  const headers = {
    'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    'Accept': 'application/json',
  }
  try {
    const lookup = await fetch(`${MAILERLITE_API}/subscribers/${encodeURIComponent(email)}`, {
      headers,
      signal: AbortSignal.timeout(MAILERLITE_TIMEOUT_MS),
    })
    if (lookup.status === 404) return
    if (!lookup.ok) {
      console.error('MailerLite lookup failed:', lookup.status, await lookup.text())
      return
    }
    const id = (await lookup.json())?.data?.id
    if (!id) {
      console.error('MailerLite lookup returned no subscriber id')
      return
    }
    const del = await fetch(`${MAILERLITE_API}/subscribers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(MAILERLITE_TIMEOUT_MS),
    })
    if (!del.ok && del.status !== 404) {
      console.error('MailerLite delete failed:', del.status, await del.text())
    }
  } catch (err) {
    console.error('MailerLite removal failed:', (err as Error).message)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorised', { status: 401, headers: corsHeaders })
  }
  const jwt = authHeader.replace('Bearer ', '')

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the token with Supabase Auth rather than trusting its payload.
  // This used to base64-decode the JWT and take `sub` unchecked, relying on
  // the platform's "Verify JWT" setting; with that setting off, a forged
  // token naming any user id would have deleted that account. getUser()
  // checks the signature and expiry and that the user still exists, so this
  // no longer depends on the dashboard setting (keep it on anyway).
  const { data: authData, error: authError } = await adminClient.auth.getUser(jwt)
  if (authError || !authData?.user) {
    return new Response('Unauthorised', { status: 401, headers: corsHeaders })
  }
  const user = { id: authData.user.id }

  // Capture the email now — it's gone once the auth user is deleted. Used
  // only for the best-effort MailerLite removal below.
  const email: string | null = authData.user.email ?? null

  // Delete avatar from storage (best-effort — don't fail if missing)
  try {
    const { data: files } = await adminClient.storage
      .from('avatars')
      .list(user.id)
    if (files?.length) {
      const paths = files.map(f => `${user.id}/${f.name}`)
      await adminClient.storage.from('avatars').remove(paths)
    }
  } catch {
    // Non-fatal — proceed with account deletion
  }

  // Delete the auth user — cascades to users → type_assessments, matches, blocks → messages
  // push_subscriptions also references auth.users with on delete cascade
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteErr) {
    return new Response(
      JSON.stringify({ error: deleteErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Account is deleted; MailerLite removal can't change that outcome.
  if (email) await removeFromMailerLite(email)

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
