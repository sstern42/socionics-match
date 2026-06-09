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
 * - Subscribes to INSERT events so new rows land in real time.
 * - Exposes markOneRead / markAllRead with optimistic local updates.
 *
 * NOTE: the realtime channel name is made unique per hook instance. Layout
 * renders NotificationBell twice (mobile burger + desktop nav), so two hooks
 * mount at once. Supabase keys channels by name — two identically-named
 * channels collide and one silently fails to receive events, which is why
 * the bell only updated on reload (the mount fetch always worked, the live
 * subscription didn't). A per-instance suffix keeps them independent.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const channelRef                        = useRef(null)
  // Stable per-instance id so the two bell instances don't share a channel name
  const instanceId                        = useRef(Math.random().toString(36).slice(2))

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

    const channel = supabase
      .channel(`notifications:${userId}:${instanceId.current}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev =>
          prev.some(n => n.id === payload.new.id) ? prev : [payload.new, ...prev]
        )
        setUnreadCount(c => c + 1)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
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
