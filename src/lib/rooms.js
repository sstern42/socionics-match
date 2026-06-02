import { supabase } from './supabase'

const PAGE_SIZE = 50

// Fetch a page of messages for a room.
// Default: latest PAGE_SIZE messages (before = null).
// For pagination, pass the created_at of the oldest currently-loaded message
// as `before` to load the next page going backwards.
// Returns messages in ascending order (oldest first) so the UI can append
// to the top when paginating and keep the list chronological.
export async function getRoomMessages(roomId, { before = null, after = null } = {}) {
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
  if (after) {
    query = query.gt('created_at', after)
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

// Fetch members of a room who are online (< 15 min) or active today (< 24 hr).
// Excludes members with hide_activity set. Capped at 20; caller renders a +N overflow.
export async function getRoomActiveMembers(roomId) {
  // Derive presence from recent room messages — last_active is only updated
  // on app load so it goes stale for active chatters. Two queries avoids
  // the embedded-join RLS issue where sender data returns null for other users.
  const threshold24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // 1. Get recent message activity — sender_id + timestamp only
  const { data: msgs, error: msgsError } = await supabase
    .from('room_messages')
    .select('sender_id, created_at')
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .gte('created_at', threshold24h)
    .order('created_at', { ascending: false })
    .limit(200)

  if (msgsError) throw msgsError

  // Deduplicate — keep the most recent message time per sender
  const latestByUser = new Map()
  for (const msg of (msgs ?? [])) {
    if (!latestByUser.has(msg.sender_id)) {
      latestByUser.set(msg.sender_id, msg.created_at)
    }
  }

  if (latestByUser.size === 0) return []

  // 2. Fetch user profiles for those senders in one query
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, type, profile_data, avatar_url')
    .in('id', Array.from(latestByUser.keys()))

  if (usersError) throw usersError

  return (users ?? [])
    .filter(u => !u.profile_data?.anonymous)
    .map(u => ({ ...u, last_active: latestByUser.get(u.id) }))
    .sort((a, b) => new Date(b.last_active) - new Date(a.last_active))
}
