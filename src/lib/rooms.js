import { supabase } from './supabase'

const PAGE_SIZE = 50

const MESSAGE_SELECT = `
  id,
  room_id,
  sender_id,
  content,
  created_at,
  edited_at,
  deleted_at,
  reply_to_id,
  reply_to:reply_to_id ( id, content, sender_id, sender:sender_id ( profile_data, type ) ),
  sender:sender_id ( id, type, profile_data, avatar_url, verified_by )
`

export async function getRoomMessages(roomId, { before = null } = {}) {
  let query = supabase
    .from('room_messages')
    .select(MESSAGE_SELECT)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).reverse()
}

export async function sendRoomMessage({ roomId, senderId, content, replyToId = null }) {
  const { data, error } = await supabase
    .from('room_messages')
    .insert({ room_id: roomId, sender_id: senderId, content, reply_to_id: replyToId })
    .select('id, room_id, sender_id, content, created_at, edited_at, deleted_at, reply_to_id')
    .single()

  if (error) throw error
  window.umami?.track('room-message-sent')
  return data
}

export async function editRoomMessage(messageId, content) {
  const { error } = await supabase
    .from('room_messages')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) throw error
  window.umami?.track('room-message-edited')
}

export async function softDeleteRoomMessage(messageId) {
  const { error } = await supabase
    .from('room_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) throw error
  window.umami?.track('room-message-deleted')
}

export async function reportRoomMessage({ messageId, reporterId, reason = null }) {
  const { error } = await supabase
    .from('room_reports')
    .insert({ message_id: messageId, reporter_id: reporterId, reason })

  if (error) throw error
  window.umami?.track('room-message-reported')
}

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

export async function enrichRoomMessage(messageId) {
  const { data, error } = await supabase
    .from('room_messages')
    .select(MESSAGE_SELECT)
    .eq('id', messageId)
    .maybeSingle()

  if (error) throw error
  return data
}
