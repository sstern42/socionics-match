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

export function subtractUnread(n) {
  if (n > 0) window.dispatchEvent(new CustomEvent('socion-subtract-unread', { detail: { n } }))
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
  // Set of the user's active match IDs. The unread count is scoped to these
  // client-side rather than trusting realtime RLS to be the only guard — so a
  // message from a conversation the user isn't part of can never inflate the
  // badge, even if realtime RLS is misconfigured for the messages table.
  const matchIdsRef = useRef(new Set())

  async function fetchMatchIds() {
    if (!userId) return []
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .is('unmatched_at', null)
    if (error) return [...matchIdsRef.current]
    const ids = (data ?? []).map(m => m.id)
    matchIdsRef.current = new Set(ids)
    return ids
  }

  async function fetchCount(matchIds) {
    if (!userId) return
    const ids = matchIds ?? [...matchIdsRef.current]
    if (ids.length === 0) { setCount(0); return }
    const since = getLastVisited()
    const { count: n, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', userId)
      .in('match_id', ids)
      .gt('created_at', since)
    if (!error) setCount(n ?? 0)
  }

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchMatchIds().then(ids => { if (!cancelled) fetchCount(ids) })

    channelRef.current = supabase
      .channel(`unread-messages:${userId}`)
      // Increment only for messages in one of the user's own matches.
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        if (payload.new.sender_id !== userId && matchIdsRef.current.has(payload.new.match_id)) {
          setCount(c => c + 1)
        }
      })
      // Keep the match set current so a match created mid-session (the hook is
      // long-lived in Layout and only re-runs on userId change) still counts.
      // RLS scopes this to matches the user can see; the id check is a cheap
      // confirm that the user is a participant.
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
      }, payload => {
        const m = payload.new
        if (m.user_a_id === userId || m.user_b_id === userId) {
          matchIdsRef.current.add(m.id)
        }
      })
      .subscribe()

    function handleRead() { setCount(0) }
    function handleSubtract(e) { setCount(c => Math.max(0, c - e.detail.n)) }
    window.addEventListener('socion-messages-read', handleRead)
    window.addEventListener('socion-subtract-unread', handleSubtract)

    return () => {
      cancelled = true
      channelRef.current?.unsubscribe()
      window.removeEventListener('socion-messages-read', handleRead)
      window.removeEventListener('socion-subtract-unread', handleSubtract)
    }
    // fetchCount/fetchMatchIds are helpers redefined each render; the effect
    // should re-run only when the user changes, so they're intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return count
}
