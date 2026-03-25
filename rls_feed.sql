import { supabase } from './supabase'

export async function getMatches(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, relation_type, created_at,
      user_a:user_a_id ( id, type, profile_data ),
      user_b:user_b_id ( id, type, profile_data )
    `)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(m => ({
    ...m,
    other: m.user_a.id === userId ? m.user_b : m.user_a,
  }))
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
