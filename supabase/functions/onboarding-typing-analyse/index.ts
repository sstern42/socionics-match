// ============================================================================
// supabase/functions/onboarding-typing-analyse/index.ts
// ============================================================================
// Issue #866 — free onboarding typing chat, "analyst" half of the two-call
// architecture (Section 4). Reads the full transcript from
// onboarding-typing-turn and returns a preliminary type + confidence
// distribution — never a full report (that's the paid Socion typing
// service, /typing, unaffected by this).
//
// In:  { transcript: {role, content}[] }
//      user_id is deliberately NOT read from the request body — it's
//      resolved from the caller's own JWT, the same way chat-socionics and
//      create-checkout-session do it. Trusting a client-supplied user_id
//      here would let any authenticated caller overwrite a different
//      user's type via apply_onboarding_type().
// Out: { primary_type, primary_confidence, alternatives, subtype,
//        requires_lean_choice, summary, key_signals, applied }
//      or, on unrecoverable malformed model output:
//      { fallback: true, message: string }
//
// One retry on invalid/malformed JSON, then falls back to `unset` +
// self-select — never silently assigns a type from a bad response
// (acceptance criteria, Section 6/10).
//
// Required env vars: ANTHROPIC_API_KEY (already configured for chat-socionics)
// Auto-injected: SUPABASE_URL, PROJECT_SECRET_KEY (service role key)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_TYPES = [
  'ILE', 'LII', 'ESE', 'SEI', 'EIE', 'LSI', 'SLE', 'IEI',
  'SEE', 'ESI', 'LIE', 'ILI', 'IEE', 'EII', 'LSE', 'SLI',
]

const ASSESSMENT_VERSION = 'onboarding-chat-v1'

const SYSTEM_PROMPT = `You are the analysis step of Socion's free onboarding typing chat. You read a complete conversational interview transcript and return a **preliminary** Socionics type read — never a full report. This sits below Socion's paid, human-reviewed typing service in depth and certainty; be honest about uncertainty rather than projecting false confidence.

## Methodology
Reason primarily from function-stack placement (Leading/Creative/Role/Vulnerable — Model A positions 1-4), not from Reinin dichotomies first. Use the function stacks table below as authoritative.

## Function Stacks — Authoritative Source (Leading, Creative, Role, Vulnerable, Suggestive, Mobilising, Ignoring, Demonstrative)
ILE: Ne, Ti, Se, Fi, Si, Fe, Ni, Te
SEI: Si, Fe, Ni, Te, Ne, Ti, Se, Fi
ESE: Fe, Si, Te, Ni, Ti, Ne, Fi, Se
LII: Ti, Ne, Fi, Se, Fe, Si, Te, Ni
EIE: Fe, Ni, Te, Si, Ti, Se, Fi, Ne
LSI: Ti, Se, Fi, Ne, Fe, Ni, Te, Si
SLE: Se, Ti, Ne, Fi, Ni, Fe, Si, Te
IEI: Ni, Fe, Si, Te, Se, Ti, Ne, Fi
SEE: Se, Fi, Ne, Ti, Ni, Te, Si, Fe
ILI: Ni, Te, Si, Fe, Se, Fi, Ne, Ti
LIE: Te, Ni, Fe, Si, Fi, Se, Ti, Ne
ESI: Fi, Se, Ti, Ne, Te, Ni, Fe, Si
LSE: Te, Si, Fe, Ni, Fi, Ne, Ti, Se
EII: Fi, Ne, Ti, Se, Te, Si, Fe, Ni
IEE: Ne, Fi, Se, Ti, Si, Te, Ni, Fe
SLI: Si, Te, Ni, Fe, Ne, Fi, Se, Ti

## Known separation pairs — check explicitly before finalising
These pairs share the same top two functions in swapped order (Mirror relation) and are the most commonly confused: ILE/LII, ESE/SEI, LSE/SLI, EIE/IEI, LIE/ILI, SEE/ESI. If your read lands on one of these, explicitly weigh the other member of the pair as the top alternative before deciding.

## Confidence bands
- 85%+ — strong, function-stack evidence is clear and consistent
- 70-84% — plausible, but note a genuine alternative
- 60-69% — genuine uncertainty, alternative is nearly as plausible
- Below 60% — set requires_lean_choice: true, and list the top two candidates as near-equal in "alternatives"

## Output
Respond with JSON only, no other text, no markdown code fences, matching exactly this schema:
{
  "primary_type": "string, 3-letter acronym, e.g. ILE",
  "primary_confidence": number between 0 and 1,
  "alternatives": [{"type": "string", "confidence": number}],
  "subtype": "string or null, e.g. ILE-Ne",
  "requires_lean_choice": boolean,
  "summary": "string, 2-3 sentences, plain language, no jargon dump",
  "key_signals": ["short array of 2-4 phrases citing what was most diagnostic"]
}`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function transcriptToText(transcript: { role: string; content: string }[]): string {
  return transcript
    .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'User'}: ${m.content}`)
    .join('\n')
}

interface AnalysisResult {
  primary_type: string
  primary_confidence: number
  alternatives: { type: string; confidence: number }[]
  subtype: string | null
  requires_lean_choice: boolean
  summary: string
  key_signals: string[]
}

function parseAnalysis(text: string): AnalysisResult | null {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)

    if (typeof parsed.primary_type !== 'string' || !VALID_TYPES.includes(parsed.primary_type)) return null
    if (typeof parsed.primary_confidence !== 'number' || parsed.primary_confidence < 0 || parsed.primary_confidence > 1) return null
    if (!Array.isArray(parsed.alternatives)) return null
    if (typeof parsed.summary !== 'string') return null
    if (!Array.isArray(parsed.key_signals)) return null

    return {
      primary_type: parsed.primary_type,
      primary_confidence: parsed.primary_confidence,
      alternatives: parsed.alternatives.filter(
        (a: unknown): a is { type: string; confidence: number } =>
          !!a && typeof (a as { type?: unknown }).type === 'string' && typeof (a as { confidence?: unknown }).confidence === 'number'
      ),
      subtype: typeof parsed.subtype === 'string' ? parsed.subtype : null,
      requires_lean_choice: parsed.requires_lean_choice === true,
      summary: parsed.summary,
      key_signals: parsed.key_signals.filter((s: unknown) => typeof s === 'string'),
    }
  } catch {
    return null
  }
}

async function callClaude(apiKey: string, transcriptText: string, retryNote?: string) {
  const systemBlocks: { type: string; text: string; cache_control?: { type: string } }[] = [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
  ]
  if (retryNote) systemBlocks.push({ type: 'text', text: retryNote })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemBlocks,
      messages: [{ role: 'user', content: `Full interview transcript:\n\n${transcriptText}` }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Anthropic API error (onboarding-typing-analyse):', err)
    return null
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const { transcript } = await req.json()

    if (!Array.isArray(transcript) || transcript.length === 0) {
      return json({ error: 'transcript must be a non-empty array' }, 400)
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

    // ── Analyse, with one retry on invalid JSON ────────────────────────────
    const transcriptText = transcriptToText(transcript)

    let result: AnalysisResult | null = null
    const firstText = await callClaude(apiKey, transcriptText)
    if (firstText !== null) result = parseAnalysis(firstText)

    if (!result) {
      const retryText = await callClaude(
        apiKey,
        transcriptText,
        'Your previous response was not valid JSON matching the required schema. Respond with valid JSON only, matching the schema exactly, and nothing else.'
      )
      if (retryText !== null) result = parseAnalysis(retryText)
    }

    if (!result) {
      // Fall back cleanly — never silently assign a type from malformed
      // output. Still log the transcript for debugging/QA (Section 12's
      // "manual QA against past transcripts").
      await supabase.from('type_assessments').insert({
        user_id: userRow.id,
        transcript,
        version: ASSESSMENT_VERSION,
      })

      return json({
        fallback: true,
        message: "We couldn't work out a confident read from this conversation — please self-select your type for now.",
      })
    }

    // ── Persist + apply ─────────────────────────────────────────────────────
    const distribution: Record<string, number> = { [result.primary_type]: result.primary_confidence }
    for (const alt of result.alternatives) {
      if (VALID_TYPES.includes(alt.type)) distribution[alt.type] = alt.confidence
    }

    const { error: insertError } = await supabase.from('type_assessments').insert({
      user_id: userRow.id,
      transcript,
      computed_type_distribution: distribution,
      primary_type: result.primary_type,
      primary_confidence: result.primary_confidence,
      requires_lean_choice: result.requires_lean_choice,
      version: ASSESSMENT_VERSION,
    })

    if (insertError) {
      console.error('Failed to persist type_assessment:', insertError)
    }

    const { data: applied, error: applyError } = await supabase.rpc('apply_onboarding_type', {
      p_user_id: userRow.id,
      p_type: result.primary_type,
      p_confidence: result.primary_confidence,
    })

    if (applyError) {
      console.error('apply_onboarding_type error:', applyError)
    }

    return json({
      primary_type: result.primary_type,
      primary_confidence: result.primary_confidence,
      alternatives: result.alternatives,
      subtype: result.subtype,
      requires_lean_choice: result.requires_lean_choice,
      summary: result.summary,
      key_signals: result.key_signals,
      applied: applyError ? false : !!applied,
    })
  } catch (err) {
    console.error('onboarding-typing-analyse error:', err)
    return json({ error: (err as Error).message ?? 'Something went wrong.' }, 500)
  }
})
