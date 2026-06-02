import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getRoomMessages,
  sendRoomMessage,
  editRoomMessage,
  softDeleteRoomMessage,
  reportRoomMessage,
  subscribeToRoom,
  enrichRoomMessage,
} from '../lib/rooms'

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

  // ── Initial load ─────────────────────────────────────────────
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
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [roomId])

  // ── Real-time subscription ────────────────────────────────────
  useEffect(() => {
    if (!roomId) return

    channelRef.current = subscribeToRoom(roomId, async (rawMsg) => {
      if (optimisticIdsRef.current.has(rawMsg.id)) return
      try {
        const enriched = await enrichRoomMessage(rawMsg.id)
        if (!enriched) return
        setMessages((prev) => {
          if (prev.some((m) => m.id === enriched.id)) return prev
          return [...prev, enriched]
        })
      } catch { /* non-fatal */ }
    })

    return () => { channelRef.current?.unsubscribe(); channelRef.current = null }
  }, [roomId])

  // ── Pagination ────────────────────────────────────────────────
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

  // ── Send ──────────────────────────────────────────────────────
  const send = useCallback(async (content, replyToId = null) => {
    if (!roomId || !profile?.id || sending) return
    if (!content?.trim()) return

    setSendError(null)
    setSending(true)

    const tempId = `optimistic-${Date.now()}`
    const replyToMsg = replyToId ? messages.find((m) => m.id === replyToId) : null

    const optimistic = {
      id: tempId,
      room_id: roomId,
      sender_id: profile.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      reply_to_id: replyToId,
      reply_to: replyToMsg
        ? { id: replyToMsg.id, content: replyToMsg.content, sender_id: replyToMsg.sender_id, sender: replyToMsg.sender }
        : null,
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
        replyToId,
      })

      optimisticIdsRef.current.add(real.id)
      setTimeout(() => optimisticIdsRef.current.delete(real.id), 10000)

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...real, sender: optimistic.sender, reply_to: optimistic.reply_to }
            : m
        )
      )
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }, [roomId, profile, sending, messages])

  // ── Edit ──────────────────────────────────────────────────────
  const edit = useCallback(async (messageId, content) => {
    if (!content?.trim()) return
    const now = new Date().toISOString()

    // Optimistic
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: content.trim(), edited_at: now }
          : m
      )
    )

    try {
      await editRoomMessage(messageId, content.trim())
    } catch (err) {
      // Roll back by restoring from server would require a refetch;
      // surface the error and let the user retry instead
      throw err
    }
  }, [])

  // ── Soft delete ───────────────────────────────────────────────
  const softDelete = useCallback(async (messageId) => {
    const now = new Date().toISOString()
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, deleted_at: now } : m))
    )
    try {
      await softDeleteRoomMessage(messageId)
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deleted_at: null } : m))
      )
      throw err
    }
  }, [])

  // ── Report ────────────────────────────────────────────────────
  const report = useCallback(async ({ messageId, reason }) => {
    if (!profile?.id) return
    await reportRoomMessage({ messageId, reporterId: profile.id, reason })
  }, [profile?.id])

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
    edit,
    softDelete,
    report,
  }
}
