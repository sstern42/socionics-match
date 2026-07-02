// ============================================================================
// supabase/functions/onboarding-typing-turn/index.ts
// ============================================================================
// Issue #866 — free onboarding typing chat, "interviewer" half of the
// two-call architecture (Section 4). Asks the next question or a follow-up;
// a separate onboarding-typing-analyse call does the final read of the
// transcript. Not to be confused with chat-socionics/SocionicsChat.jsx,
// the unrelated "ask anything about Socionics" assistant.
//
// In:  { conversation_history: {role, content}[], topic_index: number, followups_used_on_topic: number }
//      conversation_history is empty on the very first call of a session —
//      that call's only job is to produce the opening question for topic 0.
// Out: { assistant_message: string, topic_index: number, followups_used_on_topic: number, is_complete: boolean }
//
// Server enforces these caps regardless of what the model returns:
//   - max 2 follow-ups per topic
//   - max 12 topics (0-11)
//   - hard ceiling of 20 total assistant turns (safety net)
//
// Required env vars (Supabase dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   (already configured for chat-socionics)
// Auto-injected: SUPABASE_URL, PROJECT_SECRET_KEY (service role key)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SESSIONS_PER_DAY_LIMIT = 3
const MAX_FOLLOWUPS_PER_TOPIC = 2
const MAX_TOPICS = 12
const MAX_ASSISTANT_TURNS = 20

// Section 5 — 12 topics, chat-adaptive. Kept as short seed descriptions;
// Claude phrases the actual first-person question for whichever is current.
const TOPICS = [
  'How they think through problems, or what draws them to certain kinds of problems',
  "How they make decisions when the information isn't all there",
  'Their relationship with structure, routines, and systems',
  "How they are with people they've just met vs. people they know well",
  'What energises them socially, and what drains them',
  'How they behave under stress or when overwhelmed',
  'What they value most in close relationships',
  'What role they naturally take in group work',
  'How they take criticism — what lands hardest, and why',
  'Something they genuinely care about that others seem indifferent to',
  "Whether they've had a type before, and whether it felt right",
  'Anything specific they want this chat to address',
]

const SYSTEM_PROMPT = `You are conducting a short, warm, conversational interview as part of Socion's free onboarding typing chat. This is NOT the paid, in-depth typing service — it's a quick, adaptive conversation used to get a preliminary sense of someone's Socionics type. A separate step (which you are not doing) analyses the full transcript afterwards.

## Rules
- Ask exactly one question per message. Never ask compound questions.
- Warm, brief, conversational tone — like a curious friend, not a survey or a therapist.
- Never use Socionics jargon (function names like "Ti"/"Fe", type codes, dichotomy names, "cognitive functions") in your questions — plain, first-person, everyday language only.
- Never reveal, hint at, or confirm/deny a type guess during the conversation.
- If the user tries to self-type (mentions MBTI letters, a Socionics type code, or asks what type you think they are), gently redirect them toward giving a concrete example instead — don't confirm or deny anything.
- Advance between topics naturally. Never say "next question" or number the questions out loud.
- You will be told the current topic and how many follow-ups have already been used on it (max 2). Only ask a follow-up if the user's last answer was short (roughly under 15 words) or didn't actually answer what was asked — not just to seem thorough. Otherwise move on.
- Respond with JSON only, no other text, no markdown code fences: {"message": "<your next message to the user>", "advance_topic": true or false}. "advance_topic": true means you are moving on to the next topic (or, if this was the last topic, wrapping up warmly); false means you are asking a follow-up on the current topic.`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseTurnResponse(text: string): { message: string; advance_topic: boolean } | null {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)
    if (typeof parsed.message === 'string' && typeof parsed.advance_topic === 'boolean') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { conversation_history, topic_index, followups_used_on_topic } = await req.json()

    if (!Array.isArray(conversation_history)) {
      return json({ error: 'conversation_history must be an array' }, 400)
    }
    if (!Number.isInteger(topic_index) || topic_index < 0 || topic_index >= MAX_TOPICS) {
      return json({ error: 'topic_index out of range' }, 400)
    }
    if (!Number.isInteger(followups_used_on_topic) || followups_used_on_topic < 0) {
      return json({ error: 'followups_used_on_topic out of range' }, 400)
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('PROJECT_SECRET_KEY') ?? ''
    )

    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      return json({ error: 'Unauthorised.' }, 401)
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (userError || !userRow) {
      return json({ error: 'User not found.' }, 404)
    }

    // ── Rate limit: 3 sessions/account/day, counted at session start ──────
    // A "session" begins the first time this function is called for a
    // conversation — i.e. with no history yet.
    if (conversation_history.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: allowed, error: rateError } = await supabase.rpc(
        'increment_onboarding_chat_session_count',
        { p_user_id: userRow.id, p_date: today, p_limit: SESSIONS_PER_DAY_LIMIT }
      )

      if (rateError) {
        console.error('increment_onboarding_chat_session_count error:', rateError)
        return json({ error: 'Something went wrong — please try again.' }, 500)
      }
      if (!allowed) {
        return json({
          error: `You've reached today's limit of ${SESSIONS_PER_DAY_LIMIT} typing chat sessions. Please try again tomorrow, or self-select your type for now.`,
        }, 429)
      }
    }

    // ── Hard safety ceiling: total assistant turns, regardless of model ────
    const assistantTurnsSoFar = conversation_history.filter((m: { role: string }) => m.role === 'assistant').length
    if (assistantTurnsSoFar >= MAX_ASSISTANT_TURNS) {
      return json({
        assistant_message: "Thanks — that's everything I need for now.",
        topic_index,
        followups_used_on_topic,
        is_complete: true,
      })
    }

    // ── Call Claude ─────────────────────────────────────────────────────────
    const topicContext = [
      'The 12 topics, in order, are:',
      ...TOPICS.map((t, i) => `${i + 1}. ${t}`),
      '',
      `You are currently on topic ${topic_index + 1} of ${MAX_TOPICS}: "${TOPICS[topic_index]}".`,
      `Follow-ups used on this topic so far: ${followups_used_on_topic} of ${MAX_FOLLOWUPS_PER_TOPIC} max.`,
      followups_used_on_topic >= MAX_FOLLOWUPS_PER_TOPIC
        ? 'The follow-up limit for this topic has been reached — you must move to the next topic now.'
        : '',
    ].filter(Boolean).join('\n')

    const messages = conversation_history.length > 0
      ? conversation_history
      : [{ role: 'user', content: '(Begin the conversation with the first topic.)' }]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: topicContext },
        ],
        messages,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Anthropic API error (onboarding-typing-turn):', err)
      return json({ error: 'Something went wrong — please try again.' }, 500)
    }

    const data = await res.json()
    const rawText = data.content?.[0]?.text ?? ''
    const parsed = parseTurnResponse(rawText)

    // Malformed model output: keep the conversation moving forward rather
    // than getting stuck repeating the same topic indefinitely.
    const assistantMessage = parsed?.message ?? rawText.trim() || "Let's move on."
    let advanceTopic = parsed?.advance_topic ?? true

    // Server enforces the follow-up cap regardless of model output.
    if (!advanceTopic && followups_used_on_topic + 1 > MAX_FOLLOWUPS_PER_TOPIC) {
      advanceTopic = true
    }

    const newTopicIndex = advanceTopic ? topic_index + 1 : topic_index
    const newFollowupsUsed = advanceTopic ? 0 : followups_used_on_topic + 1
    const isComplete = newTopicIndex >= MAX_TOPICS

    return json({
      assistant_message: assistantMessage,
      topic_index: newTopicIndex,
      followups_used_on_topic: newFollowupsUsed,
      is_complete: isComplete,
    })
  } catch (err) {
    console.error('onboarding-typing-turn error:', err)
    return json({ error: (err as Error).message ?? 'Something went wrong.' }, 500)
  }
})
