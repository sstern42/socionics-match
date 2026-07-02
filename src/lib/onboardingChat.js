import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

async function authedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Something went wrong — please try again.')
  }

  if (!res.ok) {
    const err = new Error(data.error ?? 'Something went wrong — please try again.')
    err.status = res.status
    throw err
  }

  return data
}

// Out: { assistant_message, topic_index, followups_used_on_topic, is_complete }
export function requestTurn({ conversationHistory, topicIndex, followupsUsedOnTopic }) {
  return authedPost('onboarding-typing-turn', {
    conversation_history: conversationHistory,
    topic_index: topicIndex,
    followups_used_on_topic: followupsUsedOnTopic,
  })
}

// Out: { primary_type, primary_confidence, alternatives, subtype,
//        requires_lean_choice, summary, key_signals } or { fallback: true, message }
export function requestAnalysis({ transcript }) {
  return authedPost('onboarding-typing-analyse', { transcript })
}

// Out: { applied: boolean }
export function requestConfirm({ type, confidence }) {
  return authedPost('onboarding-typing-confirm', { type, confidence })
}

// Plain-text export of the transcript — no signed tokens, no Tally prefill
// (Section 9C). Triggers a browser download directly, no server round trip.
export function downloadTranscript(transcript) {
  const lines = transcript.map(m => `${m.role === 'assistant' ? 'Socion' : 'You'}: ${m.content}`)
  const text = lines.join('\n\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `socion-typing-chat-${new Date().toISOString().slice(0, 10)}.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
