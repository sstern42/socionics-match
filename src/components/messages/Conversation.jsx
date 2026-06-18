import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { RELATIONS } from '../../data/relations'
import { getCompatibilityBreakdown } from '../../data/compatibility'
import { getMessages, sendMessage, subscribeToMessages, markRead, toggleReaction, uploadMessageImage } from '../../lib/messages'
import { coolOff, hardBlock, getBlockBetween, liftBlock } from '../../lib/blocks'
import { unmatch } from '../../lib/unmatch'
import { markMatchRead, subtractUnread, getMatchLastRead } from '../../lib/useUnreadCount'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import GifPicker from '../GifPicker'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function renderContent(text) {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all' }}>{part}</a>
      : part
  )
}

function withUtm(url) {
  if (!url) return url
  try { const u = new URL(url); u.searchParams.set('utm_source','socion.app'); u.searchParams.set('utm_medium','webview'); return u.toString() }
  catch { return url }
}

function SIWebview({ url, onClose }) {
  if (!url) return null
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.45)',display:'flex',flexDirection:'column',justifyContent:'flex-end' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--card-bg)',borderRadius:'12px 12px 0 0',height:'85vh',display:'flex',flexDirection:'column',overflow:'hidden' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.75rem 1rem',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
          <span style={{ fontSize:'0.72rem',color:'var(--muted)',letterSpacing:'0.06em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'80%' }}>socionicsinsight.com</span>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'1.1rem',color:'var(--muted)',padding:'0.25rem 0.5rem',lineHeight:1,flexShrink:0 }} aria-label="Close">✕</button>
        </div>
        <iframe src={withUtm(url)} title="Socionics Insight" style={{ flex:1,border:'none',width:'100%' }} loading="lazy" />
      </div>
    </div>
  )
}

// ─── MessageInput ─────────────────────────────────────────────────────────────
// Isolated so that typing only re-renders this component, not the message list.
const MessageInput = React.memo(function MessageInput({
  onSend, sending, uploadingImage, pendingImage, replyTo, setReplyTo,
  otherName, isMobile, activeBlock, otherTyping,
  presenceChannel, tabId,
  showGifPicker, setShowGifPicker, onGifSelect, onImageSelect,
  fileInputRef, onClearPendingImage, inputRef, typingTimer, currentUserId,
}) {
  const [text, setText] = useState('')

  function handleSend() {
    onSend(text, () => {
      setText('')
      if (inputRef.current) inputRef.current.style.height = 'auto'
    })
  }

  return (
    <div style={{ borderTop:'1px solid var(--border)',background:'var(--card-bg)' }}>
      {otherTyping && (
        <div style={{ padding:'0.4rem 1.5rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
          <span style={{ fontSize:'0.72rem',color:'var(--muted)',fontStyle:'italic' }}>{otherName} is typing</span>
          <span style={{ display:'flex',gap:'3px',alignItems:'center' }}>
            {[0,1,2].map(i => <span key={i} style={{ width:4,height:4,borderRadius:'50%',background:'var(--muted)',display:'inline-block',animation:`typingDot 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
          </span>
        </div>
      )}

      {/* Pending image preview strip */}
      {(pendingImage || uploadingImage) && (
        <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.5rem 1.5rem',borderBottom:'1px solid var(--accent-lt)',background:'rgba(154,111,56,0.05)',flexShrink:0 }}>
          {uploadingImage ? (
            <>
              <span style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(154,111,56,0.25)',borderTopColor:'var(--accent)',animation:'bootSpin 0.8s linear infinite',display:'inline-block',flexShrink:0 }} />
              <span style={{ fontSize:'0.78rem',color:'var(--accent)' }}>Uploading image…</span>
            </>
          ) : pendingImage && (
            <>
              <img src={pendingImage.previewUrl} alt="pending" style={{ height:52,width:'auto',maxWidth:72,objectFit:'cover',borderRadius:4,border:'1px solid var(--border)',display:'block',flexShrink:0 }} />
              <span style={{ fontSize:'0.78rem',color:'var(--muted)',flex:1 }}>Add a caption or hit Send</span>
              <button type="button" onClick={onClearPendingImage} aria-label="Remove image" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,flexShrink:0 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* Reply preview strip */}
      {replyTo && (
        <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.5rem 1.5rem',borderBottom:'1px solid var(--border)',background:'var(--surface)' }}>
          <div style={{ flex:1,borderLeft:'2px solid var(--accent)',paddingLeft:'0.5rem' }}>
            <p style={{ fontSize:'0.7rem',color:'var(--accent)',fontWeight:500,marginBottom:'0.1rem' }}>{replyTo.sender_id===currentUserId?'You':otherName}</p>
            <p style={{ fontSize:'0.75rem',color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:300 }}>
              {replyTo.content || (replyTo.attachment_type === 'gif' ? '🎬 GIF' : replyTo.attachment_url ? '🖼️ Image' : '')}
            </p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,flexShrink:0 }} aria-label="Cancel reply">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
          </button>
        </div>
      )}

      <div style={{ padding:'0.6rem 1.5rem' }}>
        {activeBlock ? (
          <p style={{ fontSize:'0.82rem',color:'var(--muted)',textAlign:'center',padding:'0.5rem 0' }}>Messaging is paused for this conversation.</p>
        ) : (
          <>
            <div style={{ position:'relative' }}>
              {showGifPicker && (
                <GifPicker onSelect={onGifSelect} onClose={() => setShowGifPicker(false)} />
              )}
              <div
                style={{ display:'flex',alignItems:'flex-end',border:'1px solid var(--border)',borderRadius:4,overflow:'hidden',background:'var(--card-bg)' }}
              >
                <div style={{ display:'flex',flexDirection:'row',alignItems:'center',alignSelf:'center',padding:'0 0.25rem 0 0.75rem',gap:'0.15rem',flexShrink:0 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || sending}
                    title="Send image"
                    style={{ background:'none',border:'none',cursor:'pointer',color:pendingImage?'var(--accent)':'var(--muted)',padding:'0.25rem 0.3rem',lineHeight:0,opacity:(uploadingImage||sending)?0.4:1,transition:'color 0.15s, opacity 0.15s',display:'flex',alignItems:'center',justifyContent:'center' }}
                    onMouseEnter={e=>{ if(!uploadingImage&&!sending) e.currentTarget.style.color='var(--accent)' }}
                    onMouseLeave={e=>e.currentTarget.style.color=pendingImage?'var(--accent)':'var(--muted)'}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="13" height="10" rx="1.5"/>
                      <circle cx="5.5" cy="7" r="1.3"/>
                      <polyline points="1,12 5,8 7.5,10.5 10,8 14,12"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGifPicker(p => !p)}
                    disabled={uploadingImage || sending}
                    title="Send GIF"
                    style={{ background:'none',border:'none',cursor:'pointer',color:showGifPicker?'var(--accent)':'var(--muted)',padding:'0.25rem 0.3rem',lineHeight:1,opacity:(uploadingImage||sending)?0.4:1,transition:'color 0.15s',fontSize:'0.68rem',fontWeight:700,letterSpacing:'0.04em' }}
                    onMouseEnter={e=>{ if(!uploadingImage&&!sending) e.currentTarget.style.color='var(--accent)' }}
                    onMouseLeave={e=>e.currentTarget.style.color=showGifPicker?'var(--accent)':'var(--muted)'}
                  >
                    GIF
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onImageSelect} />
                </div>

                <textarea
                  ref={inputRef}
                  placeholder={pendingImage ? 'Add a caption (optional)…' : `Message ${otherName}…`}
                  value={text}
                  rows={1}
                  onChange={e => {
                    setText(e.target.value)
                    e.target.style.height='auto'; e.target.style.height=`${e.target.scrollHeight}px`
                    presenceChannel.current?.send({ type:'broadcast',event:'typing',payload:{ tab_id:tabId.current,typing:true } })
                    clearTimeout(typingTimer.current)
                    typingTimer.current = setTimeout(() => {
                      presenceChannel.current?.send({ type:'broadcast',event:'typing',payload:{ tab_id:tabId.current,typing:false } })
                    }, 2000)
                  }}
                  onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey&&!isMobile){e.preventDefault();handleSend()} }}
                  style={{ flex:1,resize:'none',overflow:'hidden',lineHeight:1.5,fontFamily:'var(--sans)',fontSize:'0.92rem',fontWeight:300,color:'var(--text)',background:'transparent',border:'none',outline:'none',padding:'0.5rem 0.5rem 0.5rem 0.75rem',maxHeight:'8rem' }}
                />
                <button
                  className="btn-primary"
                  onClick={handleSend}
                  disabled={(!text.trim()&&!pendingImage)||sending||uploadingImage}
                  style={{ borderRadius:0,alignSelf:'stretch',opacity:((!text.trim()&&!pendingImage)||sending||uploadingImage)?0.5:1 }}
                >
                  Send
                </button>
              </div>
            </div>
            {text && <p style={{ fontSize:'0.68rem',color:'var(--muted)',textAlign:'right',margin:'0.25rem 0.5rem 0',letterSpacing:'0.02em' }}>Shift + Enter for new line</p>}
          </>
        )}
      </div>
    </div>
  )
})

// ─── Conversation ─────────────────────────────────────────────────────────────
export default function Conversation({ match, currentUserId, hasFeedback, onBack, isArchived, onArchive, onUnarchive, onUnmatch }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isPremium, profile } = useAuth()
  const [webviewUrl, setWebviewUrl] = useState(null)
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [blockReason, setBlockReason] = useState('spam')
  const [blockNotes, setBlockNotes] = useState('')
  const [blockError, setBlockError] = useState(null)
  const [blocking, setBlocking] = useState(false)
  const [unmatching, setUnmatching] = useState(false)
  const [unmatched, setUnmatched] = useState(false)
  const [activeBlock, setActiveBlock] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 700)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [pendingImage, setPendingImage] = useState(null)

  const longPressTimer   = useRef(null)
  const typingTimer      = useRef(null)
  const presenceChannel  = useRef(null)
  const tabId            = useRef(Math.random().toString(36).slice(2))
  const bottomRef        = useRef(null)
  const listRef          = useRef(null)
  const prevScrollHeight = useRef(0)
  const inputRef         = useRef(null)
  const menuRef          = useRef(null)
  const fileInputRef     = useRef(null)

  async function editMessage(msgId) {
    if (!editText.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('messages').update({ content: editText.trim(), edited: true }).eq('id', msgId)
      if (error) throw error
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim(), edited: true } : m))
      setEditingId(null); setEditText('')
      window.umami?.track('message-edited')
    } catch (err) { console.error('Edit failed:', err) }
    finally { setSaving(false) }
  }

  async function deleteMessage(msgId) {
    setDeleting(true)
    try {
      const { error } = await supabase.from('messages').delete().eq('id', msgId)
      if (error) throw error
      setMessages(prev => prev.filter(m => m.id !== msgId))
      setDeleteConfirmId(null)
      window.umami?.track('message-deleted')
    } catch (err) { console.error('Delete failed:', err) }
    finally { setDeleting(false) }
  }

  async function handleToggleReaction(msgId, emoji) {
    const currentReactions = messages.find(m => m.id === msgId)?.reactions ?? []
    const existing = currentReactions.find(r => r.user_id === currentUserId && r.emoji === emoji)
    const isRemoving = !!existing
    const snapshot = currentReactions

    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m
      const reactions = m.reactions ?? []
      if (isRemoving) {
        return { ...m, reactions: reactions.filter(r => r !== existing) }
      } else {
        return { ...m, reactions: [...reactions, { id: `local-${Date.now()}`, user_id: currentUserId, emoji }] }
      }
    }))

    try {
      await toggleReaction(msgId, currentUserId, emoji, isRemoving)
      window.umami?.track('reaction-toggled', { emoji })
    } catch (err) {
      console.error('Reaction failed:', err)
      setMessages(prev => prev.map(m => m.id !== msgId ? m : { ...m, reactions: snapshot }))
    }
  }

  async function handleGifSelect(gifUrl) {
    setShowGifPicker(false)
    if (!gifUrl) return
    setSending(true)
    const replyToId = replyTo?.id ?? null
    setReplyTo(null)
    clearTimeout(typingTimer.current)
    presenceChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { tab_id: tabId.current, typing: false } })
    try {
      const msg = await sendMessage({ matchId: match.id, senderId: currentUserId, content: '', replyToId, attachmentUrl: gifUrl, attachmentType: 'gif' })
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      window.umami?.track('gif-sent')
    } finally { setSending(false) }
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) })
    e.target.value = ''
    inputRef.current?.focus()
  }

  function handleClearPendingImage() {
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage(null)
  }

  function scrollToMessage(msgId) {
    const el = document.getElementById(`msg-${msgId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.transition = 'background 0.15s'
    el.style.background = 'rgba(154,111,56,0.1)'
    setTimeout(() => { el.style.background = '' }, 900)
  }

  const relInfo = RELATIONS[match.displayRelationType ?? match.relation_type]
  const isOtherAnonymous = match.other.profile_data?.anonymous ?? false
  const otherName = isOtherAnonymous ? 'Anonymous' : (match.other.profile_data?.name ?? match.other.type)
  const otherUserId = match.other.id
  const otherVerifiedBy = match.other.verified_by ?? null

  const otherIsFounder = !isOtherAnonymous && match.other.is_founding_member === true
  const otherIsPremium = !isOtherAnonymous && !otherIsFounder && (match.other.plan_status === 'active' || match.other.plan_status === 'past_due')
  const otherBadge = otherIsFounder
    ? <span title="Founding member" style={{ fontSize: '0.8rem', color: 'var(--accent)', marginLeft: '0.3rem', verticalAlign: 'middle', lineHeight: 1 }}>✦</span>
    : otherIsPremium
      ? <span title="Premium subscriber" style={{ fontSize: '0.8rem', color: 'var(--accent)', marginLeft: '0.3rem', verticalAlign: 'middle', lineHeight: 1 }}>★</span>
      : null

  const breakdown = profile?.type
    ? getCompatibilityBreakdown(profile.type, match.other.type, match.displayRelationType ?? match.relation_type)
    : null
  const breakdownUnlocked = isPremium && !!breakdown

  const memberSince = match.other.created_at
    ? new Date(match.other.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)')
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    getBlockBetween(currentUserId, otherUserId).then(setActiveBlock).catch(() => {})
  }, [match.id])

// Initial load
  useEffect(() => {
    const matchId = match.id
    setMessages([]); setHasMore(false); setLoading(true)
    let cancelled = false
    getMessages(matchId).then(({ msgs, hasMore: more }) => {
      if (!cancelled) {
        setMessages(msgs); setHasMore(more); setLoading(false)
        const lastRead = getMatchLastRead(matchId)
        const unreadInChat = lastRead
          ? msgs.filter(m => m.sender_id !== currentUserId && new Date(m.created_at) > new Date(lastRead)).length
          : msgs.filter(m => m.sender_id !== currentUserId).length
        markMatchRead(matchId); markRead(matchId)
        subtractUnread(unreadInChat)
      }
    })

    const msgChannel = subscribeToMessages(
      matchId,
      newMsg => {
        if (!cancelled) {
          setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, { ...newMsg, reactions: [] }])
          markMatchRead(matchId)
          if (newMsg.sender_id !== currentUserId) markRead(matchId)
        }
      },
      updatedMsg => {
        if (!cancelled) setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, read_at: updatedMsg.read_at } : m))
      }
    )

    const reactionsChannel = supabase
      .channel(`reactions:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, payload => {
        if (!cancelled && payload.new.user_id !== currentUserId) {
          setMessages(prev => prev.map(m => {
            if (m.id !== payload.new.message_id) return m
            const reactions = m.reactions ?? []
            if (reactions.find(r => r.id === payload.new.id)) return m
            return { ...m, reactions: [...reactions, payload.new] }
          }))
        }
      })
      .subscribe()

    presenceChannel.current = supabase.channel(`typing:${matchId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.tab_id !== tabId.current) setOtherTyping(payload.typing === true)
      })
      .subscribe()

    return () => {
      cancelled = true
      msgChannel.unsubscribe()
      reactionsChannel.unsubscribe()
      presenceChannel.current?.unsubscribe()
    }
  }, [match.id])

  useEffect(() => {
    setBreakdownOpen(false)
    setShowGifPicker(false)
    setReactionPickerMsgId(null)
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage(null)
  }, [match.id])

  useEffect(() => {
    return () => { if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl) }
  }, [pendingImage])

  // Scroll to bottom on new messages — skip when prepending older messages
  useEffect(() => {
    if (loading || loadingMore) return
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages.length])

  // Scroll to bottom on initial load (once)
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [loading])

  // Preserve scroll position when prepending older messages
  useEffect(() => {
    if (!listRef.current || !loadingMore) return
    prevScrollHeight.current = listRef.current.scrollHeight
  }, [loadingMore])

  useEffect(() => {
    if (!listRef.current || loadingMore) return
    const diff = listRef.current.scrollHeight - prevScrollHeight.current
    if (diff > 0) listRef.current.scrollTop += diff
  }, [messages, loadingMore])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadMore() {
    if (!hasMore || loadingMore || messages.length === 0) return
    setLoadingMore(true)
    try {
      const oldest = messages[0].created_at
      const { msgs: older, hasMore: moreAvailable } = await getMessages(match.id, { before: oldest })
      setMessages(prev => [...older, ...prev])
      setHasMore(moreAvailable)
    } catch (err) { console.error('loadMore failed:', err) }
    finally { setLoadingMore(false) }
  }

  async function handleSend(text, clearText) {
    if ((!text.trim() && !pendingImage) || sending) return
    const matchId = match.id
    setSending(true)
    const replyToId = replyTo?.id ?? null
    const imageSnapshot = pendingImage
    setReplyTo(null)
    setPendingImage(null)
    clearTimeout(typingTimer.current)
    presenceChannel.current?.send({ type:'broadcast',event:'typing',payload:{ tab_id:tabId.current,typing:false } })
    try {
      let msg
      if (imageSnapshot) {
        setUploadingImage(true)
        const url = await uploadMessageImage(imageSnapshot.file, matchId)
        URL.revokeObjectURL(imageSnapshot.previewUrl)
        setUploadingImage(false)
        msg = await sendMessage({ matchId, senderId: currentUserId, content: text.trim(), replyToId, attachmentUrl: url, attachmentType: 'image' })
        window.umami?.track('image-sent')
      } else {
        msg = await sendMessage({ matchId, senderId: currentUserId, content: text.trim(), replyToId })
      }
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      clearText?.()
      inputRef.current?.focus()
    } catch (err) {
      console.error('Send failed:', err)
      setUploadingImage(false)
      if (imageSnapshot) setPendingImage(imageSnapshot)
    } finally { setSending(false) }
  }

  async function handleCoolOff() {
    setBlocking(true); setBlockError(null)
    try {
      await coolOff(currentUserId, otherUserId)
      const block = await getBlockBetween(currentUserId, otherUserId)
      setActiveBlock(block); setModal(null); setMenuOpen(false)
    } catch (err) { setBlockError(err.message) }
    finally { setBlocking(false) }
  }

  async function handleHardBlock() {
    setBlocking(true); setBlockError(null)
    try {
      await hardBlock(currentUserId, otherUserId, blockReason, blockNotes)
      navigate('/messages', { replace: true })
    } catch (err) { setBlockError(err.message); setBlocking(false) }
  }

  async function handleUnmatch() {
    setUnmatching(true); setBlockError(null)
    try {
      await unmatch(match.id)
      setUnmatched(true)
    } catch (err) { setBlockError(err.message); setUnmatching(false) }
  }

  async function handleLiftBlock() {
    if (!activeBlock) return
    try { await liftBlock(activeBlock.id); setActiveBlock(null) }
    catch (err) { console.error('Failed to lift block:', err) }
  }

  async function handleArchiveToggle() {
    setMenuOpen(false)
    if (isArchived) { await onUnarchive?.() } else { await onArchive?.() }
  }

  const isCoolingOff = activeBlock?.type === 'cooloff'
  const coolingOffUntil = isCoolingOff && activeBlock.expires_at
    ? new Date(activeBlock.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null
  const iBlockedThem = activeBlock?.blocker_id === currentUserId

  function MenuItems() {
    return isCoolingOff && iBlockedThem ? (
      <button type="button" onClick={handleLiftBlock} style={menuItemStyle}>Lift cool-off</button>
    ) : (
      <>
        <button type="button" onClick={handleArchiveToggle} style={menuItemStyle}>{isArchived ? 'Unarchive' : 'Archive'}</button>
        {!activeBlock && (
          <>
            <button type="button" onClick={() => { setModal('cooloff'); setMenuOpen(false) }} style={menuItemStyle}>Cool off (7 days)</button>
            <button type="button" onClick={() => { setModal('unmatch'); setMenuOpen(false) }} style={menuItemStyle}>Disconnect</button>
            <button type="button" onClick={() => { setModal('block'); setMenuOpen(false) }} style={{ ...menuItemStyle, color: '#c0392b' }}>Block &amp; report</button>
          </>
        )}
      </>
    )
  }

  function BreakdownPanel() {
    return (
      <div style={{ borderBottom:'1px solid var(--border)',background:'var(--bg)',padding:isMobile?'0.75rem 1rem':'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'0.75rem',flexShrink:0 }}>
        <div>
          <p style={bsl}>Function interactions</p>
          <div style={{ display:'flex',flexDirection:'column',gap:'0.4rem' }}>
            <p style={bt}>Your leading <strong>{breakdown.functions.myLeading}</strong> sits at {otherName}'s <strong>{breakdown.functions.myLeadingPosName}</strong> position.{' '}<span style={{ color:'var(--muted)' }}>{breakdown.functions.myLeadingMeaning}</span></p>
            <p style={bt}>{otherName}'s leading <strong>{breakdown.functions.otherLeading}</strong> sits at your <strong>{breakdown.functions.otherLeadingPosName}</strong> position.</p>
            <p style={bt}>Your creative <strong>{breakdown.functions.myCreative}</strong> sits at {otherName}'s <strong>{breakdown.functions.myCreativePosName}</strong> position.{' '}<span style={{ color:'var(--muted)' }}>{breakdown.functions.myCreativeMeaning}</span></p>
          </div>
        </div>
        {breakdown.strengths.length > 0 && (
          <div>
            <p style={bsl}>Strengths</p>
            <ul style={{ margin:0,paddingLeft:'1rem',display:'flex',flexDirection:'column',gap:'0.2rem' }}>
              {breakdown.strengths.map((s,i) => <li key={i} style={bt}>{s}</li>)}
            </ul>
          </div>
        )}
        {breakdown.friction.length > 0 && (
          <div>
            <p style={bsl}>Friction points</p>
            <ul style={{ margin:0,paddingLeft:'1rem',display:'flex',flexDirection:'column',gap:'0.2rem' }}>
              {breakdown.friction.map((f,i) => <li key={i} style={bt}>{f}</li>)}
            </ul>
          </div>
        )}
        {breakdown.advice && (
          <div>
            <p style={bsl}>Practical note</p>
            <p style={{ ...bt,color:'var(--muted)',fontStyle:'italic' }}>{breakdown.advice}</p>
          </div>
        )}
      </div>
    )
  }

  function LockedTeaser() {
    return (
      <div style={{ borderBottom:'1px solid var(--border)',background:'var(--bg)',padding:isMobile?'0.75rem 1rem':'1rem 1.25rem',flexShrink:0 }}>
        <div style={{ position:'relative',borderRadius:6,overflow:'hidden' }}>
          <div aria-hidden="true" style={{ display:'flex',flexDirection:'column',gap:'0.75rem',filter:'blur(5px)',opacity:0.55,userSelect:'none',pointerEvents:'none',padding:'0.1rem' }}>
            <div>
              <p style={bsl}>Function interactions</p>
              <div style={{ display:'flex',flexDirection:'column',gap:'0.4rem' }}>
                <p style={bt}>Your leading <strong>{breakdown.functions.myLeading}</strong> at {otherName}'s <strong>{breakdown.functions.myLeadingPosName}</strong>.</p>
                <p style={bt}>{otherName}'s leading <strong>{breakdown.functions.otherLeading}</strong> at your <strong>{breakdown.functions.otherLeadingPosName}</strong>.</p>
              </div>
            </div>
          </div>
          <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:'0.5rem',padding:'1.5rem 1rem 1rem',background:'linear-gradient(to bottom, color-mix(in srgb, var(--bg) 35%, transparent), color-mix(in srgb, var(--bg) 85%, transparent))' }}>
            <span style={{ fontSize:'1.4rem',lineHeight:1 }}>🔒</span>
            <p style={{ fontFamily:'var(--serif)',fontSize:isMobile?'0.95rem':'1.05rem',fontWeight:500,color:'var(--text)',margin:0 }}>
              See exactly how you and {otherName} fit
            </p>
            <p style={{ fontSize:'0.78rem',color:'var(--muted)',lineHeight:1.5,margin:0,maxWidth:360 }}>
              Premium unlocks your full Model A breakdown — function-by-function strengths, friction points and a practical note.
            </p>
            <Link to="/premium" onClick={() => window.umami?.track('breakdown-teaser-cta',{source:isMobile?'mobile':'desktop'})} style={{ marginTop:'0.15rem',display:'inline-block',background:'var(--accent)',color:'#fff',textDecoration:'none',fontSize:'0.8rem',fontWeight:500,padding:'0.5rem 1.1rem',borderRadius:4 }}>
              Unlock with Premium
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="convo-root">

      {/* Mobile header */}
      <div className="convo-header-mobile show-mobile">
        {onBack && (
          <button className="convo-back-btn" onClick={onBack} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="11,4 6,9 11,14"/></svg>
          </button>
        )}
        <Link to={`/profile/${otherUserId}`} style={{ flexShrink:0,display:'flex',alignItems:'center',textDecoration:'none' }}>
          <div style={{ width:30,height:30,borderRadius:'50%',background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center' }}>
            {match.other.avatar_url && !isOtherAnonymous
              ? <img src={match.other.avatar_url} alt={otherName} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
              : <span style={{ fontFamily:'var(--serif)',fontSize:'0.75rem',color:'var(--muted)',lineHeight:1 }}>{isOtherAnonymous ? '🕵️' : (match.other.profile_data?.name?.[0]?.toUpperCase() ?? '?')}</span>
            }
          </div>
        </Link>
        <Link to={`/profile/${otherUserId}`} className="convo-header-name" style={{ color:'inherit',textDecoration:'none' }}>{otherName}</Link>{otherBadge}
        <div className="convo-header-meta">
          <button onClick={() => { window.umami?.track('si-link-type',{type:match.other.type}); setWebviewUrl(`https://socionicsinsight.com/types/${match.other.type.toLowerCase()}/`) }} style={{ fontSize:'0.7rem',letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--accent)',fontWeight:500,background:'none',border:'none',cursor:'pointer',padding:0 }}>
            {match.other.type}
          </button>
          {relInfo && <span style={{ fontSize:'0.68rem',color:'var(--muted)',letterSpacing:'0.04em' }}>· {relInfo.name}</span>}
          {otherVerifiedBy && <span title={`Verified by ${otherVerifiedBy}`} style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:12,height:12,borderRadius:'50%',background:'var(--accent)',color:'#fff',fontSize:'0.45rem',fontWeight:700,lineHeight:1,flexShrink:0 }}>✓</span>}
          {memberSince && <span style={{ fontSize:'0.62rem',color:'var(--muted)' }}>· Member since {memberSince}</span>}
          <div style={{ position:'relative' }} ref={menuRef}>
            <button type="button" onClick={() => setMenuOpen(o=>!o)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:'1.1rem',padding:'0.25rem 0.25rem 0.25rem 0.5rem',lineHeight:1 }} aria-label="Options">···</button>
            {menuOpen && (
              <div style={{ position:'absolute',right:0,top:'100%',background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:4,minWidth:160,zIndex:50,boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
                <MenuItems />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="convo-main">

      {/* Mobile breakdown toggle */}
      {breakdown && (
        <div className="show-mobile" style={{ borderBottom:'1px solid var(--border)',background:'var(--card-bg)',textAlign:'center' }}>
          <button
            onClick={() => {
              const next = !breakdownOpen
              if (breakdownUnlocked) window.umami?.track('breakdown-toggled',{open:next,source:'mobile'})
              else if (next) window.umami?.track('breakdown-teaser-opened',{source:'mobile'})
              setBreakdownOpen(next)
            }}
            style={{ fontSize:'0.68rem',color:'var(--accent)',background:'none',border:'none',cursor:'pointer',padding:'0.45rem 1rem',letterSpacing:'0.04em' }}
          >
            {breakdownUnlocked ? (breakdownOpen ? 'Hide breakdown ↑' : 'Full breakdown ↓') : (breakdownOpen ? 'Hide breakdown ↑' : 'Full compatibility breakdown 🔒')}
          </button>
        </div>
      )}

      {/* Mobile: breakdown panel / locked teaser inline above messages */}
      <div className="show-mobile" style={{ maxHeight:'45vh',overflowY:'auto',flexShrink:0 }}>
        {breakdownOpen && breakdown && breakdownUnlocked && <BreakdownPanel />}
        {breakdownOpen && breakdown && !breakdownUnlocked && <LockedTeaser />}
      </div>

      {/* Cooling off banner */}
      {isCoolingOff && (
        <div style={{ padding:'0.6rem 1.5rem',background:'rgba(154,111,56,0.07)',borderBottom:'1px solid var(--accent-lt)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <p style={{ fontSize:'0.78rem',color:'var(--accent)' }}>
            {iBlockedThem ? `Messaging paused until ${coolingOffUntil}. ` : `${otherName} has paused messaging until ${coolingOffUntil}.`}
          </p>
          {iBlockedThem && <button type="button" onClick={handleLiftBlock} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'0.72rem',color:'var(--accent)',textDecoration:'underline' }}>Lift early</button>}
        </div>
      )}

      {!hasFeedback && messages.length >= 5 && (
        <div style={{ padding:'0.6rem 1.5rem',borderBottom:'1px solid var(--border)',background:'rgba(154,111,56,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem' }}>
          <p style={{ fontSize:'0.78rem',color:'var(--muted)' }}>Rate this connection — does the theory hold?</p>
          <button type="button" onClick={() => navigate(`/feedback/${match.id}`)} style={{ background:'none',border:'1px solid var(--accent-lt)',borderRadius:3,padding:'0.3rem 0.75rem',fontSize:'0.75rem',color:'var(--accent)',cursor:'pointer',whiteSpace:'nowrap' }}>Rate it →</button>
        </div>
      )}

      {/* Messages list */}
      <div
        ref={listRef}
        style={{ flex:1,overflowY:'auto',padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:'0.75rem',background:'var(--bg)' }}
        onScroll={() => setReactionPickerMsgId(null)}
      >
        {/* Load earlier messages */}
        {hasMore && (
          <div style={{ textAlign:'center',paddingBottom:'0.25rem' }}>
            <button type="button" onClick={loadMore} disabled={loadingMore} style={{ background:'none',border:'none',cursor:loadingMore?'default':'pointer',fontSize:'0.78rem',color:'var(--accent)',padding:'0.25rem',opacity:loadingMore?0.5:1 }}>
              {loadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ color:'var(--muted)',fontSize:'0.85rem',textAlign:'center',marginTop:'2rem' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign:'center',marginTop:'3rem' }}>
            <p style={{ fontFamily:'var(--serif)',fontStyle:'italic',fontSize:'1.1rem',color:'var(--muted)',marginBottom:'0.5rem' }}>Start the conversation.</p>
            <p style={{ fontSize:'0.78rem',color:'var(--muted)' }}>You and {otherName} are {relInfo?.name?.toLowerCase() ?? 'connected'}.</p>
          </div>
        ) : (() => {
          const now = new Date()
          const todayStr = now.toDateString()
          const yesterdayStr = new Date(now - 86400000).toDateString()
          let lastDateStr = null
          const items = []
          const lastMineId = [...messages].reverse().find(m => m.sender_id === currentUserId)?.id
          const lastReadMineId = [...messages].reverse().find(m => m.sender_id === currentUserId && m.read_at)?.id

          for (const msg of messages) {
            const msgDate = new Date(msg.created_at)
            const msgDateStr = msgDate.toDateString()
            if (msgDateStr !== lastDateStr) {
              lastDateStr = msgDateStr
              const label = msgDateStr === todayStr ? 'Today' : msgDateStr === yesterdayStr ? 'Yesterday' : msgDate.toLocaleDateString('en-GB', { day:'numeric',month:'long',year:msgDate.getFullYear()!==now.getFullYear()?'numeric':undefined })
              items.push(
                <div key={`divider-${msg.id}`} style={{ display:'flex',alignItems:'center',gap:'0.75rem',margin:'0.5rem 0' }}>
                  <div style={{ flex:1,height:1,background:'var(--border)' }} />
                  <span style={{ fontSize:'0.68rem',letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',flexShrink:0 }}>{label}</span>
                  <div style={{ flex:1,height:1,background:'var(--border)' }} />
                </div>
              )
            }
            const isMine = msg.sender_id === currentUserId
            const timeStr = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour:'2-digit',minute:'2-digit' })
            const quotedMsg = msg.reply_to
            const showReplyBtn = hoveredMsgId === msg.id && !activeBlock

            const reactionGroups = {}
            for (const r of (msg.reactions ?? [])) {
              reactionGroups[r.emoji] = reactionGroups[r.emoji] || { count: 0, mine: false }
              reactionGroups[r.emoji].count++
              if (r.user_id === currentUserId) reactionGroups[r.emoji].mine = true
            }
            const reactionEntries = Object.entries(reactionGroups)

            function startLongPress(m) {
              longPressTimer.current = setTimeout(() => { setReplyTo({ id:m.id,content:m.content,sender_id:m.sender_id }); setHoveredMsgId(null) }, 500)
            }
            function cancelLongPress() { clearTimeout(longPressTimer.current) }

            items.push(
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                style={{ alignSelf:isMine?'flex-end':'flex-start',maxWidth:'70%',width:'fit-content',display:'flex',flexDirection:'column',gap:'0.2rem',borderRadius:6,transition:'background 0.4s' }}
                onMouseEnter={() => !activeBlock && setHoveredMsgId(msg.id)}
                onMouseLeave={() => { setHoveredMsgId(null) }}
              >
                <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',flexDirection:isMine?'row-reverse':'row' }}>
                  {/* Bubble */}
                  <div
                    onClick={() => !activeBlock && !editingId && setReplyTo({ id:msg.id,content:msg.content,sender_id:msg.sender_id })}
                    onTouchStart={() => startLongPress(msg)} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}
                    style={{ background: isMine ? 'var(--accent)' : 'var(--card-bg)', color: isMine ? '#fff' : 'var(--text)', border:`1px solid ${isMine?'var(--accent)':'var(--border)'}`, borderRadius:isMine?'12px 12px 2px 12px':'12px 12px 12px 2px', padding: msg.attachment_url && !msg.content ? '0.35rem' : '0.65rem 0.9rem', fontSize:'0.9rem', lineHeight:1.6, fontWeight:300, whiteSpace:'pre-wrap', width:'fit-content', cursor:activeBlock?'default':'pointer', overflow:'hidden' }}
                  >
                    {quotedMsg && (
                      <div
                        onClick={e => { e.stopPropagation(); scrollToMessage(quotedMsg.id) }}
                        style={{ borderLeft:`2px solid ${isMine?'rgba(255,255,255,0.5)':'var(--accent-lt)'}`,paddingLeft:'0.5rem',marginBottom:'0.5rem',opacity:0.8,cursor:'pointer' }}
                      >
                        <p style={{ fontSize:'0.75rem',color:isMine?'rgba(255,255,255,0.7)':'var(--muted)',marginBottom:'0.1rem',fontWeight:500 }}>{quotedMsg.sender_id===currentUserId?'You':otherName}</p>
                        <p style={{ fontSize:'0.78rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200 }}>
                          {quotedMsg.content || (quotedMsg.attachment_type === 'gif' ? '🎬 GIF' : quotedMsg.attachment_url ? '🖼️ Image' : '')}
                        </p>
                      </div>
                    )}

                    {msg.attachment_url && (
                      <div style={{ marginBottom: msg.content ? '0.5rem' : 0 }} onClick={e => e.stopPropagation()}>
                        <img
                          src={msg.attachment_url}
                          alt={msg.attachment_type === 'gif' ? 'GIF' : 'Image'}
                          onClick={e => { e.stopPropagation(); setLightboxUrl(msg.attachment_url) }}
                          style={{ maxWidth:'100%',maxHeight:220,borderRadius:4,display:'block',objectFit:'contain',cursor:'zoom-in' }}
                          loading="lazy"
                        />
                      </div>
                    )}

                    {editingId === msg.id ? (
                      <div onClick={e=>e.stopPropagation()} style={{ display:'flex',flexDirection:'column',gap:'0.4rem',minWidth:180 }}>
                        <textarea value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();editMessage(msg.id)} if(e.key==='Escape'){setEditingId(null);setEditText('')} }} autoFocus style={{ background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,padding:'0.4rem 0.6rem',fontSize:'0.9rem',color:'#fff',resize:'none',fontFamily:'var(--sans)',lineHeight:1.5,minHeight:60 }} />
                        <div style={{ display:'flex',gap:'0.35rem' }}>
                          <button type="button" onClick={() => editMessage(msg.id)} disabled={saving||!editText.trim()} style={{ background:'var(--card-bg)',color:'var(--accent)',border:'none',borderRadius:4,padding:'0.2rem 0.6rem',fontSize:'0.7rem',fontWeight:500,cursor:'pointer',opacity:(saving||!editText.trim())?0.6:1 }}>{saving?'…':'Save'}</button>
                          <button type="button" onClick={() => { setEditingId(null);setEditText('') }} style={{ background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:'0.7rem',padding:'0.2rem' }}>Cancel</button>
                        </div>
                      </div>
                    ) : msg.content ? renderContent(msg.content) : null}
                  </div>

                  {/* Action buttons */}
                  <button type="button" onClick={e => { e.stopPropagation(); setReactionPickerMsgId(prev => prev === msg.id ? null : msg.id) }} aria-label="React" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,opacity:showReplyBtn?1:(isMobile?0.3:0),transition:'opacity 0.15s',flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="6"/><path d="M4.5 8.5c.6.9 1.6 1.2 2.5 1.2s1.9-.3 2.5-1.2"/><circle cx="5" cy="5.5" r="0.6" fill="currentColor" stroke="none"/><circle cx="9" cy="5.5" r="0.6" fill="currentColor" stroke="none"/></svg>
                  </button>
                  <button type="button" onClick={() => setReplyTo({ id:msg.id,content:msg.content,sender_id:msg.sender_id })} aria-label="Reply" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,opacity:showReplyBtn?1:(isMobile?0.3:0),transition:'opacity 0.15s',flexShrink:0,pointerEvents:'auto' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,3 1,6 4,9"/><path d="M1 6h7a5 5 0 0 1 5 5v1"/></svg>
                  </button>
                  {isMine && msg.id === lastMineId && !deleteConfirmId && (
                    <button type="button" onClick={() => { setEditingId(msg.id);setEditText(msg.content) }} aria-label="Edit" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,flexShrink:0,opacity:showReplyBtn?1:0.3 }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11H3v-2L9.5 2.5z"/></svg>
                    </button>
                  )}
                  {isMine && msg.id === lastMineId && (
                    deleteConfirmId === msg.id ? (
                      <div style={{ display:'flex',gap:'0.25rem',alignItems:'center' }}>
                        <button type="button" onClick={() => deleteMessage(msg.id)} disabled={deleting} style={{ background:'#c0392b',color:'#fff',border:'none',borderRadius:4,padding:'0.2rem 0.5rem',fontSize:'0.68rem',cursor:'pointer',opacity:deleting?0.6:1 }}>{deleting?'…':'Delete'}</button>
                        <button type="button" onClick={() => setDeleteConfirmId(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:'0.68rem',padding:'0.2rem' }}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirmId(msg.id)} aria-label="Delete" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,flexShrink:0,opacity:showReplyBtn?1:(isMobile?0.3:0.15) }}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,3 12,3"/><path d="M5,3V2h4v1"/><rect x="3" y="3" width="8" height="10" rx="1"/><line x1="6" y1="6" x2="6" y2="10"/><line x1="8" y1="6" x2="8" y2="10"/></svg>
                      </button>
                    )
                  )}
                </div>

                {/* Reaction picker */}
                {reactionPickerMsgId === msg.id && (
                  <div style={{ alignSelf:isMine?'flex-end':'flex-start',background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:20,padding:'0.3rem 0.4rem',display:'flex',gap:'0.1rem',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',zIndex:10 }}>
                    {REACTION_EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => { handleToggleReaction(msg.id, e); setReactionPickerMsgId(null) }} style={{ background: reactionGroups[e]?.mine ? 'rgba(154,111,56,0.1)' : 'none',border:'none',cursor:'pointer',fontSize:'1.05rem',padding:'0.25rem 0.3rem',borderRadius:6,lineHeight:1,transition:'background 0.1s' }} onMouseEnter={ev => { if (!reactionGroups[e]?.mine) ev.currentTarget.style.background = 'var(--surface)' }} onMouseLeave={ev => { if (!reactionGroups[e]?.mine) ev.currentTarget.style.background = 'none' }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reaction pills */}
                {reactionEntries.length > 0 && (
                  <div style={{ display:'flex',gap:'0.3rem',flexWrap:'wrap',alignSelf:isMine?'flex-end':'flex-start',paddingInline:'0.2rem' }}>
                    {reactionEntries.map(([emoji, { count, mine }]) => (
                      <button key={emoji} type="button" onClick={() => handleToggleReaction(msg.id, emoji)} style={{ background:mine?'rgba(154,111,56,0.1)':'var(--surface)',border:`1px solid ${mine?'var(--accent-lt)':'var(--border)'}`,borderRadius:12,padding:'0.12rem 0.45rem',fontSize:'0.82rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'0.25rem',lineHeight:1.4,color:'var(--text)' }}>
                        {emoji}{count > 1 && <span style={{ fontSize:'0.68rem',color:'var(--muted)' }}>{count}</span>}
                      </button>
                    ))}
                  </div>
                )}

                <span style={{ fontSize:'0.62rem',color:'var(--muted)',alignSelf:isMine?'flex-end':'flex-start',paddingInline:'0.2rem' }}>
                  {timeStr}{msg.edited?' · edited':''}
                  {isMine && isPremium && msg.id === lastReadMineId && <span style={{ color:'var(--accent)' }}> · Read</span>}
                </span>
              </div>
            )
          }
          return items
        })()}
        <div ref={bottomRef} />
      </div>

      {/* Input area — isolated component so typing doesn't re-render the message list */}
      <MessageInput
        onSend={handleSend}
        sending={sending}
        uploadingImage={uploadingImage}
        pendingImage={pendingImage}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        otherName={otherName}
        isMobile={isMobile}
        activeBlock={activeBlock}
        otherTyping={otherTyping}
        presenceChannel={presenceChannel}
        tabId={tabId}
        showGifPicker={showGifPicker}
        setShowGifPicker={setShowGifPicker}
        onGifSelect={handleGifSelect}
        onImageSelect={handleImageSelect}
        fileInputRef={fileInputRef}
        onClearPendingImage={handleClearPendingImage}
        inputRef={inputRef}
        typingTimer={typingTimer}
        currentUserId={currentUserId}
      />

      </div>

      {/* Desktop sidebar — profile, relation info, breakdown and actions */}
      <aside className="convo-sidebar hidden-mobile">
        <div style={{ padding:'1.5rem 1.25rem 1.25rem',borderBottom:'1px solid var(--border)',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:'0.5rem' }}>
          <Link to={`/profile/${otherUserId}`} style={{ flexShrink:0,textDecoration:'none' }}>
            <div style={{ width:64,height:64,borderRadius:'50%',background:'var(--surface)',border:'1px solid var(--border)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center' }}>
              {match.other.avatar_url && !isOtherAnonymous
                ? <img src={match.other.avatar_url} alt={otherName} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                : <span style={{ fontFamily:'var(--serif)',fontSize:'1.5rem',color:'var(--muted)',lineHeight:1 }}>{isOtherAnonymous ? '🕵️' : (match.other.profile_data?.name?.[0]?.toUpperCase() ?? '?')}</span>
              }
            </div>
          </Link>
          <div>
            <Link to={`/profile/${otherUserId}`} style={{ fontFamily:'var(--serif)',fontSize:'1.1rem',fontWeight:500,color:'var(--text)',textDecoration:'none' }}>{otherName}</Link>{otherBadge}
          </div>
          <div style={{ display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:'0.4rem' }}>
            <button onClick={() => { window.umami?.track('si-link-type',{type:match.other.type}); setWebviewUrl(`https://socionicsinsight.com/types/${match.other.type.toLowerCase()}/`) }} style={{ fontSize:'0.7rem',letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--accent)',fontWeight:500,background:'none',border:'none',cursor:'pointer',padding:0 }}>
              {match.other.type}
            </button>
            {otherVerifiedBy && <span title={`Verified by ${otherVerifiedBy}`} style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:13,height:13,borderRadius:'50%',background:'var(--accent)',color:'#fff',fontSize:'0.5rem',fontWeight:700,lineHeight:1,flexShrink:0 }}>✓</span>}
          </div>
          {memberSince && <span style={{ fontSize:'0.65rem',color:'var(--muted)',letterSpacing:'0.02em' }}>Member since {memberSince}</span>}
        </div>

        {relInfo && (
          <div style={{ padding:'1.25rem',borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:'0.72rem',letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--accent)',fontWeight:500 }}>{relInfo.name}</p>
            <p style={{ fontSize:'0.78rem',color:'var(--muted)',lineHeight:1.6,marginTop:'0.35rem' }}>{relInfo.description}</p>
            {breakdownUnlocked ? (
              <button onClick={() => { window.umami?.track('breakdown-toggled',{open:!breakdownOpen,source:'desktop'}); setBreakdownOpen(o=>!o) }} style={{ fontSize:'0.7rem',color:'var(--accent)',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:'0.5rem' }}>
                {breakdownOpen ? 'Hide breakdown ↑' : 'Full breakdown ↓'}
              </button>
            ) : breakdown ? (
              <button onClick={() => { const next=!breakdownOpen; if(next) window.umami?.track('breakdown-teaser-opened',{source:'desktop'}); setBreakdownOpen(next) }} style={{ fontSize:'0.7rem',color:'var(--accent)',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:'0.5rem' }}>
                {breakdownOpen ? 'Hide breakdown ↑' : 'Full breakdown 🔒'}
              </button>
            ) : relInfo.siSlug ? (
              <button onClick={() => { window.umami?.track('si-link-relation',{relation:relInfo.siSlug}); setWebviewUrl(`https://socionicsinsight.com/relations/${relInfo.siSlug}/`) }} style={{ fontSize:'0.7rem',color:'var(--accent)',opacity:0.7,background:'none',border:'none',cursor:'pointer',padding:0,marginTop:'0.5rem' }}>
                Learn more →
              </button>
            ) : null}
          </div>
        )}

        {breakdownOpen && breakdown && breakdownUnlocked && <BreakdownPanel />}
        {breakdownOpen && breakdown && !breakdownUnlocked && <LockedTeaser />}

        <div style={{ padding:'0.75rem 0',marginTop:'auto' }}>
          <MenuItems />
        </div>
      </aside>

      {/* Cool off modal */}
      {modal === 'cooloff' && (
        <div onClick={() => setModal(null)} style={overlayStyle}>
          <div onClick={e=>e.stopPropagation()} style={modalStyle}>
            <h3 style={{ fontFamily:'var(--serif)',fontSize:'1.3rem',marginBottom:'0.75rem' }}>Cool off?</h3>
            <p style={{ fontSize:'0.88rem',color:'var(--muted)',lineHeight:1.7,marginBottom:'1.5rem' }}>This will hide you and {otherName} from each other's feed and pause messaging for 7 days. The conversation stays visible. After 7 days everything returns to normal automatically.</p>
            {blockError && <p style={{ fontSize:'0.82rem',color:'#c0392b',marginBottom:'0.75rem' }}>{blockError}</p>}
            <div style={{ display:'flex',gap:'0.75rem',justifyContent:'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleCoolOff} disabled={blocking} style={{ opacity:blocking?0.6:1 }}>{blocking?'Pausing…':'Cool off for 7 days'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect modal */}
      {modal === 'unmatch' && (
        <div onClick={() => !unmatching && !unmatched && setModal(null)} style={overlayStyle}>
          <div onClick={e=>e.stopPropagation()} style={modalStyle}>
            {unmatched ? (
              <>
                <h3 style={{ fontFamily:'var(--serif)',fontSize:'1.3rem',marginBottom:'0.75rem' }}>Disconnected</h3>
                <p style={{ fontSize:'0.88rem',color:'var(--muted)',lineHeight:1.7,marginBottom:'1.5rem' }}>
                  You've disconnected from {otherName}. Your slot is free — head back to the feed to find someone new.
                </p>
                <div style={{ display:'flex',justifyContent:'flex-end' }}>
                  <button type="button" className="btn-primary" onClick={() => { window.location.href = '/feed' }}>Return to feed</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontFamily:'var(--serif)',fontSize:'1.3rem',marginBottom:'0.75rem' }}>Disconnect from {otherName}?</h3>
                <p style={{ fontSize:'0.88rem',color:'var(--muted)',lineHeight:1.7,marginBottom:'1.5rem' }}>
                  This ends the connection for both of you and removes it from both your lists. It frees up a connection slot, and you'll see each other in the feed again. Your message history isn't deleted — but neither of you can send new messages unless you reconnect.
                </p>
                {blockError && <p style={{ fontSize:'0.82rem',color:'#c0392b',marginBottom:'0.75rem' }}>{blockError}</p>}
                <div style={{ display:'flex',gap:'0.75rem',justifyContent:'flex-end' }}>
                  <button type="button" className="btn-ghost" onClick={() => setModal(null)} disabled={unmatching}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={handleUnmatch} disabled={unmatching} style={{ opacity:unmatching?0.6:1 }}>{unmatching?'Disconnecting…':'Disconnect'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Block modal */}
      {modal === 'block' && (
        <div onClick={() => setModal(null)} style={overlayStyle}>
          <div onClick={e=>e.stopPropagation()} style={modalStyle}>
            <h3 style={{ fontFamily:'var(--serif)',fontSize:'1.3rem',marginBottom:'0.75rem' }}>Block &amp; report</h3>
            <p style={{ fontSize:'0.88rem',color:'var(--muted)',lineHeight:1.7,marginBottom:'1.25rem' }}>This is permanent and cannot be undone from the app. {otherName} will be removed from your feed and this conversation will be hidden.</p>
            <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem',marginBottom:'1.25rem' }}>
              <select className="input-standalone" value={blockReason} onChange={e=>setBlockReason(e.target.value)} style={{ fontFamily:'var(--sans)' }}>
                <option value="spam">Spam or fake profile</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="other">Other</option>
              </select>
              <textarea className="input-standalone" placeholder="Additional details (optional)" value={blockNotes} onChange={e=>setBlockNotes(e.target.value)} rows={3} style={{ resize:'vertical',fontFamily:'var(--sans)',lineHeight:1.6 }} />
            </div>
            {blockError && <p style={{ fontSize:'0.82rem',color:'#c0392b',marginBottom:'0.75rem' }}>{blockError}</p>}
            <div style={{ display:'flex',gap:'0.75rem',justifyContent:'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" onClick={handleHardBlock} disabled={blocking} style={{ background:'#c0392b',color:'#fff',border:'none',padding:'0.9rem 1.5rem',fontSize:'0.82rem',fontWeight:500,letterSpacing:'0.06em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,opacity:blocking?0.6:1 }}>
                {blocking?'Blocking…':'Block permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    <SIWebview url={webviewUrl} onClose={() => setWebviewUrl(null)} />

    {lightboxUrl && (
      <div onClick={() => setLightboxUrl(null)} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out' }}>
        <img src={lightboxUrl} alt="shared image" style={{ maxWidth:'92vw',maxHeight:'90vh',objectFit:'contain',borderRadius:6 }} onClick={e=>e.stopPropagation()} />
        <button type="button" onClick={() => setLightboxUrl(null)} style={{ position:'fixed',top:'1.5rem',right:'1.5rem',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:36,height:36,color:'#fff',fontSize:'1.2rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1 }}>×</button>
      </div>
    )}
    </>
  )
}

const menuItemStyle = { display:'block',width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',padding:'0.75rem 1rem',fontSize:'0.82rem',color:'var(--text)' }
const overlayStyle  = { position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem' }
const modalStyle    = { background:'var(--card-bg)',borderRadius:6,padding:'2rem',width:'100%',maxWidth:440,boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }
const bsl = { fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--accent)',fontWeight:500,marginBottom:'0.4rem' }
const bt  = { fontSize:'0.78rem',color:'var(--text)',lineHeight:1.55,margin:0 }
