// supabase/functions/delete-account/index.ts
// Deletes the calling user's account — all data cascades from auth.users.
// Secrets required (auto-injected by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('PROJECT_SECRET_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  // Extract caller identity from JWT — Supabase platform already verified
  // the token before the function runs, so decoding is sufficient
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorised', { status: 401, headers: corsHeaders })
  }
  const jwt = authHeader.replace('Bearer ', '')
  let userId: string
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    if (!payload?.sub) throw new Error('No sub')
    userId = payload.sub
  } catch {
    return new Response('Unauthorised', { status: 401, headers: corsHeaders })
  }
  // user.id in the rest of the function was auth user id — map it
  const user = { id: userId }

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

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

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
