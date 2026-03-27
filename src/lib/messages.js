import { supabase } from './supabase'
import { getRelation } from '../data/relations'

export async function getMatches(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, relation_type, created_at, user_a_id, user_b_id, feedback_a, feedback_b,
      user_a:user_a_id ( id, type, profile_data ),
      user_b:user_b_id ( id, type, profile_data ),
      messages ( content, created_at, sender_id )
    `)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(m => {
    const msgs = m.messages ?? []
    const lastMsg = msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ?? null
    const other = m.user_a.id === userId ? m.user_b : m.user_a
    const me = m.user_a.id === userId ? m.user_a : m.user_b
    return {
      ...m,
      other,
      // What the other person IS to you — use this for all display
      displayRelationType: getRelation(other.type, me.type),
      lastMessage: lastMsg,
    }
  })
}

export async function getMessages(matchId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function sendMessage({ matchId, senderId, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: senderId, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export function subscribeToMessages(matchId, onMessage) {
  return supabase
    .channel(`messages:${matchId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, payload => onMessage(payload.new))
    .subscribe()
}
