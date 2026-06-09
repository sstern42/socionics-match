import { supabase } from './supabase'

/**
 * Insert a notification row for a user.
 * Called from Layout.jsx alongside the existing toast push,
 * so offline users catch up when they next open the bell.
 */
export async function createNotification({ userId, type, title, body, actionUrl }) {
  if (!userId) return

  if (type === 'new_message' && actionUrl) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id, body')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('action_url', actionUrl)
      .is('read_at', null)
      .maybeSingle()

    if (existing) {
      const countMatch = existing.body?.match(/\(\+(\d+)\)$/)
      const prev = countMatch ? parseInt(countMatch[1]) : 1
      const newBody = body
        ? `${body.replace(/\s*\(\+\d+\)$/, '')} (+${prev + 1})`
        : `+${prev + 1} messages`
      await supabase
        .from('notifications')
        .update({ title, body: newBody, read_at: null, created_at: new Date().toISOString() })
        .eq('id', existing.id)
      return
    }
  }

  const { error } = await supabase.from('notifications').insert({
    user_id:    userId,
    type,
    title,
    body:       body      ?? null,
    action_url: actionUrl ?? null,
  })
  if (error) console.warn('createNotification:', error.message)
}

/** Fetch most recent N notifications for a user (newest first). */
export async function getNotifications(userId, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/** Unread count — uses the partial index so it's cheap. */
export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) return 0
  return count ?? 0
}

/** Mark a single notification as read (no-op if already read). */
export async function markNotificationRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  if (error) console.warn('markNotificationRead:', error.message)
}

/** Mark all unread notifications for a user as read. */
export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) console.warn('markAllNotificationsRead:', error.message)
}
