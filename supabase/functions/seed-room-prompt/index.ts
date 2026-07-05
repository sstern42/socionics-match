// supabase/functions/seed-room-prompt/index.ts
//
// Scheduled via pg_cron (see 20260705120000_room_host_seeder.sql).
//
// Posts a short, AI-generated conversation-starter into rooms that have
// gone quiet, as the "Socion Host" bot user (profile_data.is_bot = true).
//
// Anti-dead-mall guard: a room is only seeded when
//   (a) it has active members,
//   (b) its most recent message is older than QUIET_HOURS, and
//   (c) that most recent message was NOT the host itself.
// (c) guarantees the host never posts twice in a row — a human has to
// speak between host prompts, so the host amplifies conversation rather
// than monologuing into an empty room.
//
// The insert fires the existing send-room-push webhook, so members with
// room notifications on get pinged (the whole point — re-engagement).
//
// Manual invocation: POST a JSON body to target/force specific rooms —
//   { "rooms": ["alpha","socion"], "force": true }
//   - rooms: optional array of room labels ('alpha'|'beta'|'gamma'|'delta'
//     |'socion') to restrict this run to. Omit for all rooms.
//   - force: optional; when true, bypasses the quiet-time (b) and
//     last-sender (c) gates so the host posts even to an active room. The
//     member check (a) is always kept — no point posting to an empty room.
// The scheduled cron posts an empty body ({}), i.e. all rooms, gated.
//
// Required env vars (auto-injected by Supabase):
//   SUPABASE_URL, PROJECT_SECRET_KEY
// Required secrets:
//   ANTHROPIC_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY       = Deno.env.get('PROJECT_SECRET_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // Includes x-client-info + apikey so the browser SDK (supabase.functions.invoke,
  // used by the Admin "post host prompt" button) passes CORS preflight, plus
  // x-cron-secret for the pg_cron caller.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

// A room counts as "quiet" once its last message is older than this.
const QUIET_HOURS = 18
const QUIET_MS    = QUIET_HOURS * 60 * 60 * 1000

// Per-quadra flavour used to steer the generated prompt. The global
// Socion room spans all 16 types, so it gets a cross-quadra brief.
const QUADRA_BRIEF: Record<string, string> = {
  alpha: 'Alpha quadra (ILE, LII, ESE, SEI) — valued functions Ne, Ti, Fe, Si. Themes: playful intellectual exploration, warmth, easy democratic banter, comfort and good feeling.',
  beta:  'Beta quadra (EIE, LSI, SLE, IEI) — valued functions Se, Ti, Fe, Ni. Themes: intensity, willpower, ideals and vision, drama and passion, loyalty.',
  gamma: 'Gamma quadra (SEE, ESI, LIE, ILI) — valued functions Se, Fi, Te, Ni. Themes: pragmatism, results, personal loyalty and trust, ambition, seeing through illusions.',
  delta: 'Delta quadra (IEE, EII, LSE, SLI) — valued functions Ne, Fi, Te, Si. Themes: mutual benefit, craft and competence, quiet sincerity, growth, sensory comfort.',
}

const GLOBAL_BRIEF =
  'The Socion room — all 16 Socionics types together, across every quadra. Keep it broad and inclusive so any type has a way in; a good angle is cross-quadra contrast or something universal to typology.'

// Random angles to diversify generated prompts across runs.
const ANGLES = [
  'a small everyday observation that reveals type',
  'a light would-you-rather framed around cognitive functions',
  'something people commonly mistype themselves as, and why',
  'a book / film / song that feels very "on type"',
  'how your type shows up when you are stressed or tired',
  'a hot take about a type or relation that invites disagreement',
  'what drew you to Socionics in the first place',
  'a strength of your type that others underestimate',
  'a quadra value that outsiders find hard to understand',
  'the most useful thing typology has helped you understand about someone close to you',
]

// Curated fallbacks if the model call fails, so the host never posts
// something broken (or nothing) once it has decided a room is eligible.
const FALLBACK: Record<string, string[]> = {
  alpha: [
    'What is a rabbit hole — an idea, a hobby, a random topic — that you have happily disappeared into lately?',
    'Alpha runs on good feeling and easy banter. What is something small that reliably makes your day better?',
  ],
  beta:  [
    'What is a cause, an ideal, or a project you would genuinely go to the wall for?',
    'Beta loves a bit of drama and intensity. What is a film or story that hit you harder than it had any right to?',
  ],
  gamma: [
    'What is something you used to believe about people that experience has quietly corrected?',
    'Gamma prizes real trust over surface pleasantness. How do you decide someone has actually earned yours?',
  ],
  delta: [
    'What is a skill or craft you have been slowly getting better at, with no real deadline attached?',
    'Delta values quiet, mutual benefit. Who is someone that makes your life easier just by being reliable?',
  ],
  socion: [
    'Across all 16 types: what is the type you find easiest to get along with, and the one you find hardest — and why?',
    'What first pulled you into Socionics, and has it turned out to be useful or just interesting?',
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function generatePrompt(brief: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null

  const angle = pick(ANGLES)
  const system =
    'You are "Socion Host", a warm, curious facilitator in a Socionics community chat room. ' +
    'You write a single short message to spark conversation among the members.\n\n' +
    'Rules:\n' +
    '- One message only, 1–2 sentences, ending in an open question.\n' +
    '- Warm and genuine, never corporate or cheesy. No "Hey everyone!" style greeting.\n' +
    '- On-theme for the room described below, but easy for anyone to answer.\n' +
    '- Plain text only: no markdown, no headings, at most one emoji (usually zero).\n' +
    '- Do not mention that you are an AI or a host. Just ask the question naturally.'
  const user =
    `Room: ${brief}\n\nAngle to explore this time: ${angle}\n\n` +
    'Write the conversation-starter now. Output only the message text.'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        temperature: 1,
        thinking: { type: 'disabled' },
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })

    if (!res.ok) {
      console.error('Anthropic error:', res.status, await res.text())
      return null
    }

    const data = await res.json()
    const text = (data?.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
      .trim()

    if (!text) return null
    // room_messages.content is CHECK-constrained to 1..2000 chars.
    return text.slice(0, 2000)
  } catch (err) {
    console.error('generatePrompt failed:', err)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Auth — two accepted callers:
  //   1. The pg_cron job, via the x-cron-secret header (same custom-header
  //      pattern as daily-digest — the dashboard keeps reverting the standard
  //      Authorization header to the legacy service_role JWT).
  //   2. A founder, via their session JWT (the Admin "Post host prompt"
  //      button calls this through supabase.functions.invoke). We never hand
  //      the service key to the browser, so the founder path is how the UI
  //      triggers a manual run.
  let authorized = req.headers.get('x-cron-secret') === SERVICE_KEY
  if (!authorized) {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (token) {
      const { data: { user: authUser } } = await supabase.auth.getUser(token)
      if (authUser) {
        const { data: caller } = await supabase
          .from('users')
          .select('profile_data')
          .eq('auth_id', authUser.id)
          .maybeSingle()
        if (caller?.profile_data?.role === 'founder') authorized = true
      }
    }
  }
  if (!authorized) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  // Optional JSON body for manual/targeted invocation. The cron sends {}.
  let targetRooms: string[] | null = null
  let force = false
  try {
    const body = await req.json()
    if (Array.isArray(body?.rooms)) {
      targetRooms = body.rooms.map((r: unknown) => String(r).toLowerCase())
    }
    force = body?.force === true
  } catch {
    // No body / not JSON — default to all rooms, gated.
  }

  try {
    // 1. Resolve the host bot user.
    const { data: bot, error: botError } = await supabase
      .from('users')
      .select('id')
      .eq('profile_data->>is_bot', 'true')
      .maybeSingle()

    if (botError || !bot) {
      console.error('Host bot user not found:', botError)
      return new Response('Host bot user not found', { status: 500, headers: corsHeaders })
    }

    // 2. All rooms.
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, quadra, is_global')

    if (roomsError || !rooms) {
      console.error('Could not load rooms:', roomsError)
      return new Response('Could not load rooms', { status: 500, headers: corsHeaders })
    }

    const now = Date.now()
    const seeded: string[] = []
    const skipped: Record<string, string> = {}

    for (const room of rooms) {
      const label = room.is_global ? 'socion' : (room.quadra ?? 'unknown')

      // Restrict to the requested rooms, if a target list was given.
      if (targetRooms && !targetRooms.includes(label)) continue

      // (a) Room must have active members — no point seeding an empty room.
      const memberQuery = room.is_global
        ? supabase.from('users').select('id', { count: 'exact', head: true }).not('room_id', 'is', null)
        : supabase.from('users').select('id', { count: 'exact', head: true }).eq('room_id', room.id)
      const { count: memberCount } = await memberQuery
      if (!memberCount) { skipped[label] = 'no members'; continue }

      // (b) + (c) Inspect the latest non-deleted message.
      const { data: last } = await supabase
        .from('room_messages')
        .select('sender_id, created_at')
        .eq('room_id', room.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Gates (b) + (c) — bypassed on a forced manual run.
      if (last && !force) {
        if (last.sender_id === bot.id) { skipped[label] = 'last message was the host'; continue }
        const age = now - new Date(last.created_at).getTime()
        if (age < QUIET_MS) { skipped[label] = 'still active'; continue }
      }
      // (no last message at all → eligible: the room has members but no chat yet)

      // Eligible — generate and post.
      const brief   = room.is_global ? GLOBAL_BRIEF : QUADRA_BRIEF[room.quadra ?? ''] ?? GLOBAL_BRIEF
      const content = (await generatePrompt(brief)) ?? pick(FALLBACK[label] ?? FALLBACK.socion)

      const { error: insertError } = await supabase
        .from('room_messages')
        .insert({ room_id: room.id, sender_id: bot.id, content })

      if (insertError) {
        console.error(`Insert failed for ${label}:`, insertError)
        skipped[label] = 'insert failed'
        continue
      }
      seeded.push(label)
    }

    return new Response(JSON.stringify({ seeded, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('seed-room-prompt error:', err)
    return new Response('Error', { status: 500, headers: corsHeaders })
  }
})
