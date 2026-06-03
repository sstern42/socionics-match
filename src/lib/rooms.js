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
      image_url,
      created_at,
      edited_at,
      deleted_at,
      sender:sender_id ( id, type, profile_data, avatar_url, verified_by ),
      reactions:room_message_reactions ( user_id, emoji )
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

// Send a message to a room. Supports optional image_url.
// sender_id must be the caller's internal users.id (not auth.uid()).
export async function sendRoomMessage({ roomId, senderId, content, imageUrl = null }) {
  const { data, error } = await supabase
    .from('room_messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      content: content || null,
      image_url: imageUrl || null,
    })
    .select(`
      id,
      room_id,
      sender_id,
      content,
      image_url,
      created_at,
      edited_at,
      deleted_at,
      sender:sender_id ( id, type, profile_data, avatar_url, verified_by ),
      reactions:room_message_reactions ( user_id, emoji )
    `)
    .single()

  if (error) throw error
  window.umami?.track('room-message-sent')
  return data
}

// Upload an image to the room-images bucket.
// Returns the public URL on success.
// Accepts JPEG, PNG, GIF, WebP up to MAX_IMAGE_BYTES.
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024 // 15 MB — covers animated GIFs
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function uploadRoomImage(roomId, file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, GIF, and WebP images are supported.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image too large — please keep it under 15 MB.`)
  }

  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const path = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('room-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('room-images').getPublicUrl(path)
  return data.publicUrl
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

// Add a reaction to a message. user_id must be the caller's internal users.id.
export async function addReaction({ messageId, userId, emoji }) {
  const { error } = await supabase
    .from('room_message_reactions')
    .upsert(
      { message_id: messageId, user_id: userId, emoji },
      { onConflict: 'message_id,user_id,emoji', ignoreDuplicates: true }
    )
  if (error) throw error
}

// Remove a reaction from a message.
export async function removeReaction({ messageId, userId, emoji }) {
  const { error } = await supabase
    .from('room_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
  if (error) throw error
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
      image_url,
      created_at,
      edited_at,
      deleted_at,
      sender:sender_id ( id, type, profile_data, avatar_url, verified_by ),
      reactions:room_message_reactions ( user_id, emoji )
    `)
    .eq('id', messageId)
    .maybeSingle()

  if (error) throw error
  return data
}

// Fetch members of a room who are online (< 15 min) or active today (< 24 hr).
// Excludes members with hide_activity set. Capped at 20; caller renders a +N overflow.
export async function getRoomActiveMembers(roomId) {
  const threshold24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: msgs, error: msgsError } = await supabase
    .from('room_messages')
    .select('sender_id, created_at')
    .eq('room_id', roomId)
    .is('deleted_at', null)
    .gte('created_at', threshold24h)
    .order('created_at', { ascending: false })
    .limit(200)

  if (msgsError) throw msgsError

  const latestByUser = new Map()
  for (const msg of (msgs ?? [])) {
    if (!latestByUser.has(msg.sender_id)) {
      latestByUser.set(msg.sender_id, msg.created_at)
    }
  }

  if (latestByUser.size === 0) return []

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
