import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/notifications'

/**
 * Manages the notification centre state for a given user.
 *
 * - Loads the latest 50 notifications on mount.
 * - Subscribes to INSERT events so new rows land in real time
 *   (this is what the bell sees when the user is online and the
 *   createNotification call in Layout fires).
 * - Exposes markOneRead / markAllRead with optimistic local updates.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const channelRef                        = useRef(null)

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [items, count] = await Promise.all([
        getNotifications(userId),
        getUnreadCount(userId),
      ])
      setNotifications(items)
      setUnreadCount(count)
    } catch (err) {
      console.warn('useNotifications fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Initial load
  useEffect(() => {
    if (!userId) return
    fetchAll()
  }, [fetchAll])

  // Realtime — picks up rows inserted by createNotification in Layout
  useEffect(() => {
    if (!userId) return
    channelRef.current = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(c => c + 1)
      })
      .subscribe()
    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [userId])

  const markOneRead = useCallback(async (id) => {
    const notif = notifications.find(n => n.id === id)
    if (!notif || notif.read_at) return           // already read, skip
    // Optimistic
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    )
    setUnreadCount(c => Math.max(0, c - 1))
    await markNotificationRead(id)
  }, [notifications])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const now = new Date().toISOString()
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
    setUnreadCount(0)
    await markAllNotificationsRead(userId)
  }, [userId])

  return { notifications, unreadCount, loading, markOneRead, markAllRead, refetch: fetchAll }
}
