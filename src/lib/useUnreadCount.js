import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const STORAGE_KEY = 'socion_messages_last_visited'
const MATCH_READ_PREFIX = 'socion_read_'

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
  window.dispatchEvent(new Event('socion-messages-read'))
}

export function markMatchRead(matchId) {
  localStorage.setItem(MATCH_READ_PREFIX + matchId, new Date().toISOString())
}

export function getMatchLastRead(matchId) {
  return localStorage.getItem(MATCH_READ_PREFIX + matchId) ?? null
}

export function isMatchUnread(match, currentUserId) {
  const last = match.lastMessage
  if (!last) return false
  if (last.sender_id === currentUserId) return false
  const lastRead = getMatchLastRead(match.id)
  if (!lastRead) return true
  return new Date(last.created_at) > new Date(lastRead)
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

    function handleRead() { setCount(0) }
    window.addEventListener('socion-messages-read', handleRead)

    return () => {
      channelRef.current?.unsubscribe()
      window.removeEventListener('socion-messages-read', handleRead)
    }
  }, [userId])

  return count
}
