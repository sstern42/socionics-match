import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('PROJECT_SECRET_KEY')!

// The 16 canonical socionics types. Anything outside this list (e.g. a
// custom "type" created by an admin) should not be counted in stats.
const VALID_TYPES = new Set([
  'ILE', 'LII', 'ESE', 'SEI', 'EIE', 'LSI', 'SLE', 'IEI',
  'SEE', 'ESI', 'LIE', 'ILI', 'IEE', 'EII', 'LSE', 'SLI',
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  // Only this project's own pg_cron job should be able to trigger this
  // function — it's configured to send the service role key as a bearer
  // token.
  if (req.headers.get('Authorization') !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Count users
  const { count: userCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })

  // Count distinct countries
  const { data: countryData } = await supabase
    .from('users')
    .select('profile_data')
    .not('profile_data->country', 'is', null)

  const countries = new Set(
    (countryData ?? [])
      .map(u => u.profile_data?.country)
      .filter(Boolean)
  )

  // Count connections (matches)
  const { count: connectionCount } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })

  // Count distinct types
  const { data: typeData } = await supabase
    .from('users')
    .select('type')

  const types = new Set(
    (typeData ?? [])
      .map(u => u.type)
      .filter(t => VALID_TYPES.has(t))
  )

  // Upsert into stats table
  const { error } = await supabase
    .from('stats')
    .upsert({
      id: 1,
      users: userCount ?? 0,
      countries: countries.size,
      connections: connectionCount ?? 0,
      types: types.size,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Failed to write stats:', error)
    return new Response('Error', { status: 500 })
  }

  return new Response(JSON.stringify({ users: userCount, countries: countries.size, connections: connectionCount, types: types.size }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
