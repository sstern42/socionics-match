import { supabase } from './supabase'
import { getRelation } from '../data/relations'
import { getActiveBlocks } from './blocks'

const MSG_SELECT = `
  id, sender_id, content, created_at, edited, read_at, reply_to_id,
  attachment_url, attachment_type,
  reply_to:reply_to_id(id, content, sender_id, attachment_url, attachment_type),
  reactions:message_reactions(id, emoji, user_id)
`

const PAGE_SIZE = 50

export async function getMatches(userId) {
  const [{ data, error }, blocks] = await Promise.all([
    supabase
      .from('matches')
      .select(`
        id, relation_type, created_at, user_a_id, user_b_id, feedback_a, feedback_b, unmatched_at,
        user_a:user_a_id ( id, type, profile_data, avatar_url, verified_by, created_at, is_founding_member, plan_status ),
        user_b:user_b_id ( id, type, profile_data, avatar_url, verified_by, created_at, is_founding_member, plan_status ),
        messages ( content, created_at, sender_id )
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .is('unmatched_at', null)
      .order('created_at', { ascending: false }),
    getActiveBlocks(userId),
  ])
  if (error) throw error
  const blockedIds = new Set(blocks.map(b =>
    b.blocker_id === userId ? b.blocked_id : b.blocker_id
  ))
  return (data ?? [])
    .filter(m => {
      const otherId = m.user_a_id === userId ? m.user_b_id : m.user_a_id
      return !blockedIds.has(otherId)
    })
    .map(m => {
    const msgs = m.messages ?? []
    const lastMsg = msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null
    const other = m.user_a.id === userId ? m.user_b : m.user_a
    const me = m.user_a.id === userId ? m.user_a : m.user_b
    return {
      ...m,
      other,
      displayRelationType: getRelation(other.type, me.type),
      lastMessage: lastMsg,
    }
  }).sort((a, b) => {
    const aTime = a.lastMessage?.created_at ?? a.created_at
    const bTime = b.lastMessage?.created_at ?? b.created_at
    return new Date(bTime) - new Date(aTime)
  })
}

// Returns { msgs, hasMore }
// Fetches the most recent PAGE_SIZE messages, or PAGE_SIZE messages before `before` (ISO string cursor).
export async function getMessages(matchId, { before = null } = {}) {
  let query = supabase
    .from('messages')
    .select(MSG_SELECT)
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  return {
    msgs: [...rows].reverse(), // oldest → newest for display
    hasMore: rows.length === PAGE_SIZE,
  }
}

export async function sendMessage({ matchId, senderId, content, replyToId = null, attachmentUrl = null, attachmentType = null }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: senderId,
      content,
      reply_to_id: replyToId,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
    })
    .select(MSG_SELECT)
    .single()
  if (error) throw error
  window.umami?.track('message-sent')
  return data
}

export async function toggleReaction(messageId, _userId, emoji, _isRemoving) {
  // SECURITY DEFINER RPC — bypasses RLS, handles toggle atomically server-side
  const { error } = await supabase.rpc('toggle_message_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  })
  if (error) throw error
}

export async function uploadMessageImage(file, matchId) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${matchId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('message-attachments')
    .upload(path, file, { contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('message-attachments').getPublicUrl(path)
  return data.publicUrl
}

export async function markRead(matchId) {
  const { error } = await supabase.rpc('mark_messages_read', { p_match_id: matchId })
  if (error) console.error('markRead failed:', error)
}

export function subscribeToMessages(matchId, onMessage, onUpdate) {
  return supabase
    .channel(`messages:${matchId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, payload => onMessage(payload.new))
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, payload => { if (onUpdate) onUpdate(payload.new) })
    .subscribe()
}
