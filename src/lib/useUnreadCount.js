import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const STORAGE_KEY = 'socion_messages_last_visited'

export function getLastVisited() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const now = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, now)
    return now
  }
  return localStorage.getItem(STORAGE_KEY)
}

export function markMessagesRead() {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString())
}

export function useUnreadCount(userId) {
  const [count, setCount] = useState(0)
  const channelRef = useRef(null)

  async function fetchCount() {
    if (!userId) return
    const since = getLastVisited()
    const { count: n, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', userId)
      .gt('created_at', since)
    if (!error) setCount(n ?? 0)
  }

  useEffect(() => {
    if (!userId) return
    fetchCount()

    // Subscribe to new messages and increment count if not sent by current user
    channelRef.current = supabase
      .channel('unread-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        if (payload.new.sender_id !== userId) {
          setCount(c => c + 1)
        }
      })
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [userId])

  return count
}
