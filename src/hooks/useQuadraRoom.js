import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getRoomMessages,
  sendRoomMessage,
  softDeleteRoomMessage,
  reportRoomMessage,
  subscribeToRoom,
  enrichRoomMessage,
  addReaction,
  removeReaction,
} from '../lib/rooms'

// useQuadraRoom — encapsulates all data logic for the quadra group room UI.
//
// Usage:
//   const {
//     messages, loading, error,
//     hasMore, loadMore, loadingMore,
//     send, sending, sendError,
//     softDelete, report,
//     roomId,
//   } = useQuadraRoom({ profile })
//
// profile must be the AuthContext profile object (needs profile.id and profile.room_id).

export function useQuadraRoom({ profile }) {
  const roomId = profile?.room_id ?? null

  const [messages, setMessages]       = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending]         = useState(false)
  const [sendError, setSendError]     = useState(null)

  const channelRef       = useRef(null)
  const optimisticIdsRef = useRef(new Set())

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return

    let cancelled = false
    setMessages([])
    setError(null)
    setHasMore(false)
    setLoading(true)

    getRoomMessages(roomId)
      .then((msgs) => {
        if (cancelled) return
        setMessages(msgs)
        setHasMore(msgs.length === 50)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [roomId])

  // ── Real-time subscription ───────────────────────────────────
  // Realtime INSERT payloads don't include JOIN data, so we enrich each
  // incoming message before appending it. The enrichment round-trip is
  // fast (~50ms) and invisible — far better than showing a bare payload.
  useEffect(() => {
    if (!roomId) return

    channelRef.current = subscribeToRoom(roomId, async (rawMsg) => {
      // Skip our own optimistic messages — they're already in state.
      if (optimisticIdsRef.current.has(rawMsg.id)) return

      try {
        const enriched = await enrichRoomMessage(rawMsg.id)
        if (!enriched) return
        setMessages((prev) => {
          // Deduplicate by id (idempotent if enrich raced with initial load)
          if (prev.some((m) => m.id === enriched.id)) return prev
          return [...prev, enriched]
        })
      } catch {
        // Non-fatal: message will appear on next page load
      }
    })

    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [roomId])

  // ── Visibility refetch — recover missed messages after tab wake ─
  useEffect(() => {
    if (!roomId) return
    async function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      setMessages(prev => {
        if (!prev.length) return prev
        const latest = prev[prev.length - 1].created_at
        // Fire async fetch outside the setState callback
        getRoomMessages(roomId, { after: latest }).then(fresh => {
          if (!fresh.length) return
          setMessages(current => {
            const ids = new Set(current.map(m => m.id))
            const newOnes = fresh.filter(m => !ids.has(m.id))
            return newOnes.length ? [...current, ...newOnes] : current
          })
        }).catch(() => {})
        return prev
      })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [roomId])

  // ── Reactions realtime ─────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    const channel = supabase
      .channel(`reactions:${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_message_reactions' }, ({ new: r }) => {
        setMessages(prev => prev.map(m => {
          if (m.id !== r.message_id) return m
          const existing = m.reactions ?? []
          if (existing.some(x => x.user_id === r.user_id && x.emoji === r.emoji)) return m
          return { ...m, reactions: [...existing, { user_id: r.user_id, emoji: r.emoji }] }
        }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_message_reactions' }, ({ old: r }) => {
        setMessages(prev => prev.map(m => {
          if (m.id !== r.message_id) return m
          return { ...m, reactions: (m.reactions ?? []).filter(x => !(x.user_id === r.user_id && x.emoji === r.emoji)) }
        }))
      })
      .subscribe()
    return () => channel.unsubscribe()
  }, [roomId])

  // ── Load older messages (pagination) ────────────────────────
  const loadMore = useCallback(async () => {
    if (!roomId || loadingMore || !hasMore) return
    setLoadingMore(true)

    try {
      const oldest = messages[0]?.created_at ?? null
      const older = await getRoomMessages(roomId, { before: oldest })
      setMessages((prev) => [...older, ...prev])
      setHasMore(older.length === 50)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }, [roomId, loadingMore, hasMore, messages])

  // ── Send message ─────────────────────────────────────────────
  // Optimistic: builds a temporary message object using the sender's
  // profile data. Replaces itself with the real row on success, or
  // rolls back with a sendError on failure.
  const send = useCallback(async (content) => {
    if (!roomId || !profile?.id || sending) return
    if (!content?.trim()) return

    setSendError(null)
    setSending(true)

    // Build an optimistic message — matches the shape returned by getRoomMessages
    const tempId = `optimistic-${Date.now()}`
    const optimistic = {
      id: tempId,
      room_id: roomId,
      sender_id: profile.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      sender: {
        id: profile.id,
        type: profile.type,
        profile_data: profile.profile_data,
        avatar_url: profile.avatar_url,
        verified_by: profile.verified_by ?? null,
      },
      _optimistic: true,
    }

    setMessages((prev) => [...prev, optimistic])

    try {
      const real = await sendRoomMessage({
        roomId,
        senderId: profile.id,
        content: content.trim(),
      })

      // Track the real ID so the realtime broadcast doesn't double-add it
      optimisticIdsRef.current.add(real.id)
      setTimeout(() => optimisticIdsRef.current.delete(real.id), 10000)

      // Replace optimistic with the real row
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? real : m))
      )
    } catch (err) {
      // Roll back
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }, [roomId, profile, sending])

  // ── Soft delete ──────────────────────────────────────────────
  // Updates local state immediately; the RLS enforces server-side.
  const softDelete = useCallback(async (messageId) => {
    const now = new Date().toISOString()
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, deleted_at: now } : m
      )
    )

    try {
      await softDeleteRoomMessage(messageId)
    } catch (err) {
      // Roll back optimistic delete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deleted_at: null } : m
        )
      )
      throw err
    }
  }, [])

  // ── Report ───────────────────────────────────────────────────
  const report = useCallback(async ({ messageId, reason }) => {
    if (!profile?.id) return
    await reportRoomMessage({ messageId, reporterId: profile.id, reason })
  }, [profile?.id])

  // ── Toggle reaction ──────────────────────────────────────────
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!profile?.id) return
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return
    const reactions = msg.reactions ?? []
    const hasReacted = reactions.some(r => r.user_id === profile.id && r.emoji === emoji)
    const snapshot = reactions

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const updated = hasReacted
        ? (m.reactions ?? []).filter(r => !(r.user_id === profile.id && r.emoji === emoji))
        : [...(m.reactions ?? []), { user_id: profile.id, emoji }]
      return { ...m, reactions: updated }
    }))

    try {
      if (hasReacted) {
        await removeReaction({ messageId, userId: profile.id, emoji })
      } else {
        await addReaction({ messageId, userId: profile.id, emoji })
      }
      window.umami?.track('room-reaction', { emoji, action: hasReacted ? 'remove' : 'add' })
    } catch {
      // Roll back
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: snapshot } : m
      ))
    }
  }, [messages, profile?.id])

  return {
    roomId,
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    send,
    sending,
    sendError,
    softDelete,
    report,
    toggleReaction,
  }
}
