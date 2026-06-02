import { supabase } from './supabase'

const PAGE_SIZE = 50

// Fetch a page of messages for a room.
// Default: latest PAGE_SIZE messages (before = null).
// For pagination, pass the created_at of the oldest currently-loaded message
// as `before` to load the next page going backwards.
// Returns messages in ascending order (oldest first) so the UI can append
// to the top when paginating and keep the list chronological.
export async function getRoomMessages(roomId, { before = null } = {}) {
  let query = supabase
    .from('room_messages')
    .select(`
      id,
      room_id,
      sender_id,
      content,
      created_at,
      edited_at,
      deleted_at,
      sender:sender_id ( id, type, profile_data, avatar_url, verified_by )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  if (error) throw error

  // Return ascending so the caller can prepend/append naturally
  return (data ?? []).reverse()
}

// Send a message to a room.
// sender_id must be the caller's internal users.id (not auth.uid()).
export async function sendRoomMessage({ roomId, senderId, content }) {
  const { data, error } = await supabase
    .from('room_messages')
    .insert({ room_id: roomId, sender_id: senderId, content })
    .select('id, room_id, sender_id, content, created_at, edited_at, deleted_at')
    .single()

  if (error) throw error
  window.umami?.track('room-message-sent')
  return data
}

// Soft-delete a message. Sets deleted_at to now().
// Content replacement ('[message removed]') is handled in the UI layer.
// RLS ensures only the sender can call this (or service role for admin).
export async function softDeleteRoomMessage(messageId) {
  const { error } = await supabase
    .from('room_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) throw error
  window.umami?.track('room-message-deleted')
}

// Submit a report against a message.
// reporter_id must be the caller's internal users.id.
export async function reportRoomMessage({ messageId, reporterId, reason = null }) {
  const { error } = await supabase
    .from('room_reports')
    .insert({ message_id: messageId, reporter_id: reporterId, reason })

  if (error) throw error
  window.umami?.track('room-message-reported')
}

// Subscribe to new messages in a room.
// Calls onMessage(newMsg) on each INSERT.
// Returns the channel — caller must call channel.unsubscribe() on cleanup.
export function subscribeToRoom(roomId, onMessage) {
  return supabase
    .channel(`room_messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe()
}

// Fetch the full sender record for a newly-broadcast message.
// Realtime INSERT payloads don't include joined data, so we re-fetch the
// full row with the sender join after a broadcast arrives.
export async function enrichRoomMessage(messageId) {
  const { data, error } = await supabase
    .from('room_messages')
    .select(`
      id,
      room_id,
      sender_id,
      content,
      created_at,
      edited_at,
      deleted_at,
      sender:sender_id ( id, type, profile_data, avatar_url, verified_by )
    `)
    .eq('id', messageId)
    .maybeSingle()

  if (error) throw error
  return data
}
