// supabase/functions/_shared/auth.ts
// These functions are meant to be invoked only by this project's own pg_cron
// jobs and database webhooks, both of which are configured (in the Supabase
// dashboard / cron schedule SQL, outside this repo) to send the service role
// key as a bearer token. There's no other gate in front of them, so this is
// the only thing stopping an arbitrary internet request from triggering them.

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export function requireServiceRole(req: Request): Response | null {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${SERVICE_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  return null
}
