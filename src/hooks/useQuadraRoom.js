import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  getRoomMessages,
  sendRoomMessage,
  softDeleteRoomMessage,
  reportRoomMessage,
  subscribeToRoom,
  enrichRoomMessage,
  addReaction,
  removeReaction,
  uploadRoomImage,
} from '../lib/rooms'

export function useQuadraRoom({ profile }) {
  const roomId = profile?.room_id ?? null

  const [messages, setMessages]             = useState([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)
  const [hasMore, setHasMore]               = useState(false)
  const [loadingMore, setLoadingMore]       = useState(false)
  const [sending, setSending]               = useState(false)
  const [sendError, setSendError]           = useState(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadError, setImageUploadError] = useState(null)

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
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [roomId])

  // ── Real-time subscription ────────────────────────────────────
  // Deduplication: `optimisticIdsRef` tracks real IDs we sent ourselves.
  // We add the real ID BEFORE replacing the optimistic message so the
  // realtime handler (which may fire concurrently) always sees it in the set.
  useEffect(() => {
    if (!roomId) return

    channelRef.current = subscribeToRoom(roomId, async (rawMsg) => {
      // Skip messages we sent — handled via the optimistic flow in send()
      if (optimisticIdsRef.current.has(rawMsg.id)) return

      try {
        const enriched = await enrichRoomMessage(rawMsg.id)
        if (!enriched) return
        setMessages((prev) => {
          // Strict dedup: if the real row is already present, skip
          if (prev.some((m) => m.id === enriched.id)) return prev
          return [...prev, enriched]
        })
      } catch {
        // Non-fatal
      }
    })

    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [roomId])

  // ── Visibility refetch ────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    async function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      setMessages(prev => {
        if (!prev.length) return prev
        const latest = prev[prev.length - 1].created_at
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

  // ── Reactions realtime ────────────────────────────────────────
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

  // ── Load older messages ───────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!roomId || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const oldest = messages[0]?.created_at ?? null
      const older  = await getRoomMessages(roomId, { before: oldest })
      setMessages((prev) => [...older, ...prev])
      setHasMore(older.length === 50)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }, [roomId, loadingMore, hasMore, messages])

  // ── Send text message ─────────────────────────────────────────
  const send = useCallback(async (content, replyToId = null, imageUrl = null) => {
    if (!roomId || !profile?.id || sending) return
    if (!content?.trim() && !imageUrl) return

    setSendError(null)
    setSending(true)

    const tempId = `optimistic-${Date.now()}`
    const optimistic = {
      id:          tempId,
      room_id:     roomId,
      sender_id:   profile.id,
      content:     content?.trim() || null,
      image_url:   imageUrl || null,
      reply_to_id: replyToId || null,
      reply_to:    null,
      created_at:  new Date().toISOString(),
      edited_at:   null,
      deleted_at:  null,
      sender: {
        id:           profile.id,
        type:         profile.type,
        profile_data: profile.profile_data,
        avatar_url:   profile.avatar_url,
        verified_by:  profile.verified_by ?? null,
      },
      _optimistic: true,
    }

    setMessages((prev) => [...prev, optimistic])

    try {
      const real = await sendRoomMessage({
        roomId,
        senderId:  profile.id,
        content:   content?.trim() || null,
        imageUrl:  imageUrl || null,
        replyToId: replyToId || null,
      })

      // Register the real ID BEFORE updating state so the realtime handler
      // (which may already be in-flight) sees it and skips the duplicate.
      optimisticIdsRef.current.add(real.id)
      setTimeout(() => optimisticIdsRef.current.delete(real.id), 10000)

      // Replace the optimistic placeholder, AND remove any copy the realtime
      // handler may have already added (race condition when both devices open).
      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== tempId && m.id !== real.id)
        return [...filtered, real]
      })
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }, [roomId, profile, sending])

  // ── Upload image then send ────────────────────────────────────
  const uploadImage = useCallback(async (file, caption = '', replyToId = null) => {
    if (!roomId || !profile?.id || imageUploading) return
    setImageUploadError(null)
    setImageUploading(true)
    try {
      const url = await uploadRoomImage(roomId, file)
      await send(caption, replyToId, url)
      window.umami?.track('room-image-sent', { type: file.type })
    } catch (err) {
      setImageUploadError(err.message)
    } finally {
      setImageUploading(false)
    }
  }, [roomId, profile, imageUploading, send])

  // ── Soft delete ───────────────────────────────────────────────
  const softDelete = useCallback(async (messageId) => {
    const now = new Date().toISOString()
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_at: now } : m))
    try {
      await softDeleteRoomMessage(messageId)
    } catch (err) {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted_at: null } : m))
      throw err
    }
  }, [])

  // ── Report ────────────────────────────────────────────────────
  const report = useCallback(async ({ messageId, reason }) => {
    if (!profile?.id) return
    await reportRoomMessage({ messageId, reporterId: profile.id, reason })
  }, [profile?.id])

  // ── Toggle reaction ───────────────────────────────────────────
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!profile?.id) return
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return
    const reactions  = msg.reactions ?? []
    const hasReacted = reactions.some(r => r.user_id === profile.id && r.emoji === emoji)
    const snapshot   = reactions

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
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: snapshot } : m))
    }
  }, [messages, profile?.id])

  return {
    roomId,
    messages,
    setMessages,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    send,
    sending,
    sendError,
    uploadImage,
    imageUploading,
    imageUploadError,
    softDelete,
    report,
    toggleReaction,
  }
}
