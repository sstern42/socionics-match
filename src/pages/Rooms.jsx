import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useQuadraRoom } from '../hooks/useQuadraRoom'
import { supabase } from '../lib/supabase'
import { getQuadra } from '../data/relations'
import SIWebview from '../components/SIWebview'
import { usePushNotifications } from '../lib/usePushNotifications'
import { getRoomActiveMembers, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../lib/rooms'
import { updateProfileData } from '../lib/profile'

const QUADRA_COLOURS = { Alpha:'#BA7517', Beta:'#791F1F', Gamma:'#0F6E56', Delta:'#185FA5' }
const ROOM_LAST_VISITED_KEY = 'socion_room_last_visited'
const REACTIONS = ['👍', '❤️', '😂', '🔥', '👀', '✓']

export function markRoomVisited() { localStorage.setItem(ROOM_LAST_VISITED_KEY, new Date().toISOString()) }
export function getRoomLastVisited() { return localStorage.getItem(ROOM_LAST_VISITED_KEY) }

function getSenderName(msg) {
  if (msg.sender?.profile_data?.anonymous) return 'Anonymous'
  return msg.sender?.profile_data?.name ?? msg.sender?.type ?? 'Unknown'
}

function timeStr(dateStr) {
  const d = new Date(dateStr), now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday:'short' })
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' })
}

function dateDividerLabel(dateStr) {
  const d = new Date(dateStr), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now - 86400000)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'long' })
}

function renderContent(text) {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color:'inherit', textDecoration:'underline', wordBreak:'break-all' }}>{part}</a>
      : part
  )
}

function RoomMessage({
  msg, isMine, currentUserId,
  onReply, onEdit, onReport, onTypeClick, onReact, onImageClick, onScrollToMessage,
  editingId, editText, setEditText, onEditSave, onEditCancel,
  deleteConfirmId, setDeleteConfirmId, deleting, onDeleteConfirm,
  isMobile,
}) {
  const [hovered, setHovered] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const longPressTimer = useRef(null)

  const isDeleted    = !!msg.deleted_at
  const isOptimistic = !!msg._optimistic
  const isEditing    = editingId === msg.id
  const isDeleteConfirm = deleteConfirmId === msg.id

  const senderName  = getSenderName(msg)
  const senderType  = msg.sender?.type ?? '?'
  const isAnon      = msg.sender?.profile_data?.anonymous ?? false
  const senderId    = msg.sender?.id
  const quadra      = getQuadra(senderType)
  const badgeColour = QUADRA_COLOURS[quadra] ?? 'var(--accent)'

  const replyMsg = msg.reply_to ?? null
  const replySenderName = replyMsg
    ? (replyMsg.sender_id === currentUserId ? 'You' : (replyMsg.sender?.profile_data?.name ?? replyMsg.sender?.type ?? 'Unknown'))
    : null

  const hasImage = !!msg.image_url && !isDeleted
  const hasText  = !!msg.content  && !isDeleted

  function startLongPress() {
    longPressTimer.current = setTimeout(() => {
      if (!isDeleted) onReply({ id:msg.id, content:msg.content, image_url:msg.image_url, sender_id:msg.sender_id, senderName })
    }, 500)
  }
  function cancelLongPress() { clearTimeout(longPressTimer.current) }

  const showActions = (hovered || isMobile) && !isDeleted && !isOptimistic

  return (
    <div
      style={{ display:'flex', flexDirection:'column', gap:'0.2rem', opacity:isOptimistic?0.6:1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Sender row */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
        <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:600, color:'var(--accent)', userSelect:'none' }}>
          {msg.sender?.avatar_url && !isAnon
            ? <img src={msg.sender.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span>{senderName ? senderName[0].toUpperCase() : '?'}</span>
          }
        </div>

        {senderId && !isAnon ? (
          <Link to={`/profile/${senderId}`} style={{ fontSize:'0.82rem', fontWeight:500, color:'var(--text)', textDecoration:'none' }} onMouseEnter={e=>e.currentTarget.style.color='var(--accent)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text)'}>
            {senderName}
          </Link>
        ) : (
          <span style={{ fontSize:'0.82rem', fontWeight:500, color:'var(--text)' }}>{senderName}</span>
        )}

        <button type="button" onClick={() => onTypeClick(`https://socionicsinsight.com/types/${senderType.toLowerCase()}/`)} style={{ fontSize:'0.6rem', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600, color:badgeColour, border:`1px solid ${badgeColour}44`, padding:'0.1rem 0.4rem', borderRadius:2, background:'none', cursor:'pointer' }}>
          {senderType}
        </button>

        {msg.sender?.verified_by && (
          <span title={`Verified by ${msg.sender.verified_by}`} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:11, height:11, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:'0.4rem', fontWeight:700, lineHeight:1 }}>✓</span>
        )}

        <span style={{ fontSize:'0.68rem', color:'var(--muted)', marginLeft:'auto', flexShrink:0 }}>
          {timeStr(msg.created_at)}{msg.edited_at && !isDeleted ? ' · edited' : ''}
        </span>
      </div>

      {/* Bubble row */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexDirection:isMine?'row-reverse':'row' }}>
        <div
          onTouchStart={startLongPress} onTouchEnd={cancelLongPress} onTouchMove={cancelLongPress}
          style={{
            background: isMine ? 'var(--accent)' : 'var(--card-bg)',
            color: isMine ? '#fff' : isDeleted ? 'var(--muted)' : 'var(--text)',
            border: `1px solid ${isMine ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            padding: hasImage && !hasText && !replyMsg ? '0.4rem' : '0.6rem 0.9rem',
            fontSize:'0.9rem', lineHeight:1.6, fontWeight:300,
            fontStyle: isDeleted ? 'italic' : 'normal',
            maxWidth:'75%', whiteSpace:'pre-wrap', wordBreak:'break-word', overflow:'hidden',
          }}
        >
          {/* Reply quote */}
          {replyMsg && !isDeleted && (
            <div
              onClick={() => onScrollToMessage?.(replyMsg.id)}
              title="Jump to original message"
              style={{ cursor:'pointer', borderLeft:`2px solid ${isMine?'rgba(255,255,255,0.5)':'var(--accent-lt)'}`, background:isMine?'rgba(0,0,0,0.08)':'rgba(154,111,56,0.06)', borderRadius:'0 4px 4px 0', padding:'0.3rem 0.5rem', margin:'-0.1rem -0.1rem 0.5rem -0.1rem', transition:'opacity 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}
            >
              <p style={{ fontSize:'0.72rem', color:isMine?'rgba(255,255,255,0.75)':'var(--accent)', marginBottom:'0.15rem', fontWeight:600 }}>↑ {replySenderName}</p>
              {replyMsg.image_url && <img src={replyMsg.image_url} alt="" crossOrigin="anonymous" style={{ height:36, width:'auto', maxWidth:60, objectFit:'cover', borderRadius:3, display:'block', marginBottom:replyMsg.content?'0.2rem':0 }} />}
              {replyMsg.content ? (
                <p style={{ fontSize:'0.78rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220, opacity:0.9 }}>{replyMsg.content}</p>
              ) : replyMsg.image_url ? (
                <p style={{ fontSize:'0.72rem', opacity:0.7 }}>🖼 Image</p>
              ) : null}
            </div>
          )}

          {/* Image */}
          {hasImage && (
            <img src={msg.image_url} alt="shared image" crossOrigin="anonymous"
              onError={e => { e.currentTarget.style.display='none'; if(e.currentTarget.nextSibling?.dataset?.fallback) e.currentTarget.nextSibling.style.display='flex' }}
              onClick={() => onImageClick(msg.image_url)}
              style={{ display:'block', maxWidth:'100%', maxHeight:280, width:'auto', height:'auto', borderRadius:6, cursor:'zoom-in', marginBottom:hasText?'0.5rem':0, objectFit:'contain' }}
            />
          )}
          {hasImage && (
            <div data-fallback="1" style={{ display:'none', alignItems:'center', gap:'0.4rem', fontSize:'0.78rem', color:isMine?'rgba(255,255,255,0.7)':'var(--muted)', padding:'0.25rem 0' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="4" width="16" height="13" rx="2"/><circle cx="7" cy="9" r="1.5"/><polyline points="2,17 7,11 11,15 14,12 18,17"/></svg>
              Image unavailable
            </div>
          )}

          {/* Text / edit */}
          {isEditing ? (
            <div onClick={e=>e.stopPropagation()} style={{ display:'flex', flexDirection:'column', gap:'0.4rem', minWidth:180 }}>
              <textarea value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onEditSave(msg.id)} if(e.key==='Escape')onEditCancel() }} autoFocus style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, padding:'0.4rem 0.6rem', fontSize:'0.9rem', color:'#fff', resize:'none', fontFamily:'var(--sans)', lineHeight:1.5, minHeight:60 }} />
              <div style={{ display:'flex', gap:'0.35rem' }}>
                <button type="button" onClick={() => onEditSave(msg.id)} disabled={!editText.trim()} style={{ background:'var(--card-bg)', color:'var(--accent)', border:'none', borderRadius:4, padding:'0.2rem 0.6rem', fontSize:'0.7rem', fontWeight:500, cursor:'pointer', opacity:editText.trim()?1:0.5 }}>Save</button>
                <button type="button" onClick={onEditCancel} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:'0.7rem', padding:'0.2rem' }}>Cancel</button>
              </div>
            </div>
          ) : (
            isDeleted ? '[message removed]' : hasText ? renderContent(msg.content) : null
          )}
        </div>

        {/* Action icons */}
        {!isDeleted && !isEditing && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.25rem', flexDirection:isMine?'row-reverse':'row', opacity:showActions?1:(isMobile?0.25:0), transition:'opacity 0.15s', pointerEvents:showActions?'auto':(isMobile?'auto':'none'), position:'relative' }}>
            {/* Reaction picker */}
            {showPicker && (
              <div onPointerDown={e=>e.stopPropagation()} style={{ position:'absolute', bottom:'130%', [isMine?'right':'left']:0, display:'flex', gap:'0.2rem', background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:20, padding:'0.3rem 0.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.12)', zIndex:20, whiteSpace:'nowrap' }}>
                {REACTIONS.map(emoji => (
                  <button key={emoji} type="button" onPointerDown={e=>e.stopPropagation()} onClick={() => { onReact(msg.id,emoji); setShowPicker(false) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.05rem', padding:'0.1rem 0.15rem', borderRadius:'50%', lineHeight:1, transition:'transform 0.1s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.3)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => onReply({ id:msg.id, content:msg.content, image_url:msg.image_url, sender_id:msg.sender_id, senderName })} aria-label="Reply" style={iconBtnStyle}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,3 1,6 4,9"/><path d="M1 6h7a5 5 0 0 1 5 5v1"/></svg>
            </button>
            <button type="button" onPointerDown={e=>e.stopPropagation()} onClick={() => setShowPicker(p=>!p)} aria-label="React" style={{ ...iconBtnStyle, fontSize:'0.85rem', lineHeight:1 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 9.5s.75 1.5 2.5 1.5 2.5-1.5 2.5-1.5"/><circle cx="5.5" cy="6.5" r="0.75" fill="currentColor" stroke="none"/><circle cx="10.5" cy="6.5" r="0.75" fill="currentColor" stroke="none"/></svg>
            </button>
            {isMine && <button type="button" onClick={() => onEdit(msg.id, msg.content??'')} aria-label="Edit" style={iconBtnStyle}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11H3v-2L9.5 2.5z"/></svg></button>}
            {isMine && (
              isDeleteConfirm ? (
                <div style={{ display:'flex', gap:'0.25rem', alignItems:'center' }}>
                  <button type="button" onClick={() => onDeleteConfirm(msg.id)} disabled={deleting} style={{ background:'#c0392b', color:'#fff', border:'none', borderRadius:4, padding:'0.2rem 0.5rem', fontSize:'0.68rem', cursor:'pointer', opacity:deleting?0.6:1 }}>{deleting?'…':'Delete'}</button>
                  <button type="button" onClick={() => setDeleteConfirmId(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'0.68rem', padding:'0.2rem' }}>Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setDeleteConfirmId(msg.id)} aria-label="Delete" style={iconBtnStyle}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,3 12,3"/><path d="M5,3V2h4v1"/><rect x="3" y="3" width="8" height="10" rx="1"/><line x1="6" y1="6" x2="6" y2="10"/><line x1="8" y1="6" x2="8" y2="10"/></svg></button>
              )
            )}
            {!isMine && <button type="button" onClick={() => onReport(msg.id)} aria-label="Report" style={iconBtnStyle}><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h10l-2 5 2 5H2V2z"/></svg></button>}
          </div>
        )}
      </div>

      {/* Reaction pills */}
      {(() => {
        const groups = {}
        for (const r of msg.reactions??[]) {
          if (!groups[r.emoji]) groups[r.emoji] = []
          groups[r.emoji].push(r.user_id)
        }
        const entries = Object.entries(groups)
        if (!entries.length) return null
        return (
          <div style={{ display:'flex', gap:'0.25rem', flexWrap:'wrap', marginTop:'0.2rem', justifyContent:isMine?'flex-end':'flex-start' }}>
            {entries.map(([emoji, users]) => {
              const iReacted = users.includes(currentUserId)
              return (
                <button key={emoji} type="button" onPointerDown={e=>e.stopPropagation()} onClick={() => onReact(msg.id,emoji)} title={`${users.length} reaction${users.length!==1?'s':''}`} style={{ display:'inline-flex', alignItems:'center', gap:'0.2rem', background:iReacted?'rgba(154,111,56,0.1)':'rgba(0,0,0,0.05)', border:`1px solid ${iReacted?'var(--accent-lt)':'transparent'}`, borderRadius:12, padding:'0.1rem 0.45rem', cursor:'pointer', fontSize:'0.78rem', lineHeight:1.5, transition:'background 0.15s' }}>
                  <span>{emoji}</span>
                  <span style={{ fontSize:'0.7rem', color:iReacted?'var(--accent)':'var(--muted)', fontWeight:500 }}>{users.length}</span>
                </button>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

function ReportModal({ onSubmit, onClose, submitting }) {
  const [reason, setReason] = useState('')
  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e=>e.stopPropagation()} style={modalStyle}>
        <h3 style={{ fontFamily:'var(--serif)', fontSize:'1.2rem', marginBottom:'0.75rem' }}>Report message</h3>
        <p style={{ fontSize:'0.85rem', color:'var(--muted)', lineHeight:1.6, marginBottom:'1rem' }}>Reports are reviewed by the founder. Your identity is not shared.</p>
        <textarea className="input-standalone" placeholder="Reason (optional)" value={reason} onChange={e=>setReason(e.target.value)} rows={3} style={{ resize:'none', fontFamily:'var(--sans)', lineHeight:1.6, marginBottom:'1rem' }} />
        <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => onSubmit(reason||null)} disabled={submitting} style={{ opacity:submitting?0.6:1 }}>{submitting?'Submitting…':'Submit report'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Rooms() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // PATCH: viewingRoomId override for founder quadra switcher
  const [viewingRoomId, setViewingRoomId]     = useState(null)
  const [viewingQuadra, setViewingQuadra]     = useState(null)

  const { roomId, messages, setMessages, loading:roomLoading, error:roomError, hasMore, loadMore, loadingMore, send, sending, sendError, uploadImage, imageUploading, imageUploadError, softDelete, report, toggleReaction } = useQuadraRoom({ profile, roomIdOverride: viewingRoomId })

  const { supported:pushSupported, permission:pushPermission, subscribed:pushSubscribed, subscribe:pushSubscribe } = usePushNotifications(profile?.id)
  const [enablingRoomNotif, setEnablingRoomNotif] = useState(false)
  const roomNotifsEnabled = profile?.profile_data?.room_notifications === true

  async function enableRoomNotifications() {
    if (!profile || enablingRoomNotif) return
    setEnablingRoomNotif(true)
    try {
      if (!pushSubscribed) await pushSubscribe()
      await updateProfileData(profile.id, { profileData: { ...profile.profile_data, room_notifications: true } })
      await refreshProfile()
      window.umami?.track('room-notifications-enabled-from-prompt')
    } catch (err) { console.error('Failed to enable room notifications:', err) }
    finally { setEnablingRoomNotif(false) }
  }

  const [activeMembers, setActiveMembers]     = useState([])
  const [text, setText]                       = useState('')
  const [pendingImage, setPendingImage]       = useState(null)
  const [replyTo, setReplyTo]                 = useState(null)
  const [editingId, setEditingId]             = useState(null)
  const [editText, setEditText]               = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting, setDeleting]               = useState(false)
  const [memberCount, setMemberCount]         = useState(null)
  const [reportTarget, setReportTarget]       = useState(null)
  const [reporting, setReporting]             = useState(false)
  const [reportSuccess, setReportSuccess]     = useState(false)
  const [actionError, setActionError]         = useState(null)
  const [webviewUrl, setWebviewUrl]           = useState(null)
  const [lightboxUrl, setLightboxUrl]         = useState(null)
  const [highlightedMsgId, setHighlightedMsgId] = useState(null)
  const [isMobile, setIsMobile]               = useState(() => window.innerWidth <= 700)

  const imageInputRef    = useRef(null)
  const bottomRef        = useRef(null)
  const inputRef         = useRef(null)
  const listRef          = useRef(null)
  const prevScrollHeight = useRef(0)
  const typingChannel    = useRef(null)
  const typingTimer      = useRef(null)
  const typingTimers     = useRef({})
  const tabId            = useRef(Math.random().toString(36).slice(2))
  const [typingUsers, setTypingUsers] = useState({})

  // PATCH: quadra reflects viewed room when founder is browsing
  const quadra       = viewingQuadra ?? (profile?.type ? getQuadra(profile.type) : null)
  const quadraColour = QUADRA_COLOURS[quadra] ?? 'var(--accent)'
  const isAnonymous  = profile?.profile_data?.anonymous ?? false
  const isFounder    = profile?.profile_data?.role === 'founder'
  const isReadOnly   = !!viewingRoomId && viewingQuadra !== (profile?.type ? getQuadra(profile.type) : null)

  useEffect(() => { if(!loading&&!session) navigate('/auth') }, [session,loading])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)')
    const h = e => setIsMobile(e.matches)
    mq.addEventListener('change',h)
    return () => mq.removeEventListener('change',h)
  }, [])

  useEffect(() => { markRoomVisited(); window.dispatchEvent(new Event('socion-room-visited')) }, [])
  useEffect(() => { document.body.classList.add('messages-page'); return () => document.body.classList.remove('messages-page') }, [])

  useEffect(() => {
    if (!roomId || !profile?.id) return
    typingChannel.current = supabase.channel(`room_typing:${roomId}`)
      .on('broadcast', { event:'typing' }, ({ payload }) => {
        if (payload.tab_id === tabId.current) return
        const userId = payload.user_id
        if (payload.typing) {
          setTypingUsers(prev => ({ ...prev, [userId]: { name:payload.name, userType:payload.user_type } }))
          clearTimeout(typingTimers.current[userId])
          typingTimers.current[userId] = setTimeout(() => {
            setTypingUsers(prev => { const n={...prev}; delete n[userId]; return n })
          }, 4000)
        } else {
          clearTimeout(typingTimers.current[userId])
          setTypingUsers(prev => { const n={...prev}; delete n[userId]; return n })
        }
      })
      .subscribe()
    return () => {
      typingChannel.current?.send({ type:'broadcast', event:'typing', payload:{ tab_id:tabId.current, user_id:profile.id, typing:false } })
      typingChannel.current?.unsubscribe()
      typingChannel.current = null
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, [roomId, profile?.id])

  useEffect(() => {
    if (!roomId) return
    supabase.from('users').select('id',{count:'exact',head:true}).eq('room_id',roomId).then(({count})=>setMemberCount(count))
    function fetchActive() { getRoomActiveMembers(roomId).then(setActiveMembers).catch(()=>{}) }
    fetchActive()
    const id = setInterval(fetchActive, 60000)
    return () => clearInterval(id)
  }, [roomId])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || messages[messages.length-1]?._optimistic) bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  useEffect(() => { if(!listRef.current||!loadingMore) return; prevScrollHeight.current=listRef.current.scrollHeight }, [loadingMore])
  useEffect(() => {
    if(!listRef.current||loadingMore) return
    const diff = listRef.current.scrollHeight - prevScrollHeight.current
    if(diff>0) listRef.current.scrollTop+=diff
  }, [messages,loadingMore])

  useEffect(() => {
    if(!roomLoading && messages.length>0) bottomRef.current?.scrollIntoView({ behavior:'auto' })
  }, [roomLoading])

  useEffect(() => {
    return () => { if(pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl) }
  }, [pendingImage])

  // PATCH: founder quadra switcher — looks up room_id for any quadra
  async function handleQuadraSwitcher(q) {
    const ownQuadra = profile?.type ? getQuadra(profile.type) : null
    if (q === ownQuadra && !viewingRoomId) return // already on own room
    if (q === ownQuadra) {
      // return to own room
      setViewingRoomId(null); setViewingQuadra(null); return
    }
    if (q === viewingQuadra) return // already viewing this one
    try {
      const { data, error } = await supabase.from('rooms').select('id').eq('quadra', q.toLowerCase()).single()
      if (!error && data) { setViewingRoomId(data.id); setViewingQuadra(q) }
    } catch (err) { console.error('Could not switch room:', err) }
  }

  function handleScrollToMessage(msgId) {
    const el = document.getElementById(`room-msg-${msgId}`)
    if (!el) return
    el.scrollIntoView({ behavior:'smooth', block:'center' })
    setHighlightedMsgId(msgId)
    setTimeout(() => setHighlightedMsgId(null), 1400)
  }

  async function handleSend() {
    if ((!text.trim()&&!pendingImage)||sending||imageUploading) return
    const caption=text.trim(), imageFile=pendingImage?.file??null, replyToId=replyTo?.id??null
    setText(''); setPendingImage(null); setReplyTo(null); inputRef.current?.focus()
    clearTimeout(typingTimer.current)
    typingChannel.current?.send({ type:'broadcast',event:'typing',payload:{ tab_id:tabId.current,user_id:profile.id,typing:false } })
    if (imageFile) { await uploadImage(imageFile,caption,replyToId) }
    else { await send(caption,replyToId) }
  }

  function handleImageFileChange(e) {
    const file=e.target.files?.[0]; e.target.value=''
    if(!file) return
    if(pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage({ file, previewUrl:URL.createObjectURL(file) })
    inputRef.current?.focus()
  }

  function handleClearPendingImage() {
    if(pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage(null)
  }

  function handleStartEdit(messageId, currentContent) {
    setEditingId(messageId); setEditText(currentContent); setDeleteConfirmId(null)
  }

  async function handleEditSave(messageId) {
    if (!editText.trim()) return
    try {
      await supabase.from('room_messages').update({ content:editText.trim(), edited_at:new Date().toISOString() }).eq('id',messageId)
      setMessages(prev => prev.map(m => m.id===messageId ? { ...m, content:editText.trim(), edited_at:new Date().toISOString() } : m))
      setEditingId(null); setEditText('')
      window.umami?.track('room-message-edited')
    } catch { setActionError('Could not save edit — try again.') }
  }

  async function handleDeleteConfirm(messageId) {
    setDeleting(true); setActionError(null)
    try { await softDelete(messageId); setDeleteConfirmId(null) }
    catch { setActionError('Could not delete that message — try again.') }
    finally { setDeleting(false) }
  }

  async function handleReport(reason) {
    if (!reportTarget) return
    setReporting(true)
    try { await report({ messageId:reportTarget, reason }); setReportTarget(null); setReportSuccess(true); setTimeout(()=>setReportSuccess(false),3000) }
    catch { /* non-fatal */ }
    finally { setReporting(false) }
  }

  function renderMessages() {
    const items = []
    let lastDateStr = null
    for (const msg of messages) {
      const dateStr = new Date(msg.created_at).toDateString()
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr
        items.push(
          <div key={`divider-${msg.id}`} style={{ display:'flex',alignItems:'center',gap:'0.75rem',margin:'0.5rem 0' }}>
            <div style={{ flex:1,height:1,background:'var(--border)' }} />
            <span style={{ fontSize:'0.68rem',letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',flexShrink:0 }}>{dateDividerLabel(msg.created_at)}</span>
            <div style={{ flex:1,height:1,background:'var(--border)' }} />
          </div>
        )
      }
      const isHighlighted = msg.id === highlightedMsgId
      items.push(
        <div key={msg.id} id={`room-msg-${msg.id}`} style={{ borderRadius:6, margin:'0 -0.4rem', padding:'0 0.4rem', transition:'background 0.25s', background:isHighlighted?'rgba(154,111,56,0.13)':'transparent' }}>
          <RoomMessage
            msg={msg} isMine={msg.sender_id===profile?.id} currentUserId={profile?.id} isMobile={isMobile}
            onReply={setReplyTo} onEdit={handleStartEdit} onReport={id=>setReportTarget(id)} onReact={toggleReaction}
            onTypeClick={url=>{ window.umami?.track('room-type-badge-clicked'); setWebviewUrl(url) }}
            onImageClick={url=>setLightboxUrl(url)} onScrollToMessage={handleScrollToMessage}
            editingId={editingId} editText={editText} setEditText={setEditText}
            onEditSave={handleEditSave} onEditCancel={() => { setEditingId(null); setEditText('') }}
            deleteConfirmId={deleteConfirmId} setDeleteConfirmId={setDeleteConfirmId}
            deleting={deleting} onDeleteConfirm={handleDeleteConfirm}
          />
        </div>
      )
    }
    return items
  }

  if (!loading && profile && !profile.type) {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}>
          <p className="eyebrow">Quadra rooms</p>
          <h2 style={{ fontFamily:'var(--serif)',fontSize:'1.75rem',marginTop:'0.5rem' }}>Set your type to join a room</h2>
          <p style={{ color:'var(--muted)',fontSize:'0.88rem',maxWidth:380,textAlign:'center',lineHeight:1.7 }}>Set your Socionics type to be assigned to your quadra room.</p>
          <Link to="/profile/edit" className="btn-primary" style={{ textDecoration:'none' }}>Set your type →</Link>
        </section>
      </Layout>
    )
  }

  if (!loading && profile && !roomId) {
    return <Layout noScroll hideFooter><section style={centreStyle}><p style={{ color:'var(--muted)' }}>Assigning your room…</p></section></Layout>
  }

  return (
    <Layout hideFooter noScroll>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
        <div className="messages-outer" style={{ maxWidth:720, width:'100%', margin:'0 auto', flex:1, display:'flex', flexDirection:'column', padding:'0 1.5rem', minHeight:0, boxSizing:'border-box' }}>
          <div style={{ flex:1, display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderLeft:isMobile?'none':undefined, borderRight:isMobile?'none':undefined, borderTop:'none', background:'var(--card-bg)', overflow:'hidden', minHeight:0 }}>

            {/* Header */}
            <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid var(--border)', background:'var(--card-bg)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:quadraColour, flexShrink:0, display:'inline-block' }} />
                  <h2 style={{ fontFamily:'var(--serif)', fontSize:'1.2rem', fontWeight:500, margin:0, color:quadraColour }}>{quadra} quadra</h2>
                  {memberCount!=null && <span style={{ fontSize:'0.72rem', color:'var(--muted)', letterSpacing:'0.04em' }}>· {memberCount} {memberCount===1?'member':'members'}</span>}
                </div>
                <p style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:'0.2rem' }}>
                  {isReadOnly ? `Viewing as ${profile?.type} · read only` : `${profile?.type} — your quadra room`}
                </p>
                {/* Quadra switcher */}
                <div style={{ display:'flex', gap:'0.35rem', marginTop:'0.45rem', flexWrap:'wrap' }}>
                  {['Alpha','Beta','Gamma','Delta'].map(q => {
                    const ownQ  = profile?.type ? getQuadra(profile.type) : null
                    const active = viewingQuadra ? viewingQuadra===q : ownQ===q
                    return (
                      <button key={q} type="button" onClick={() => handleQuadraSwitcher(q)} style={{ fontSize:'0.6rem', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600, padding:'0.15rem 0.5rem', borderRadius:2, border:`1px solid ${QUADRA_COLOURS[q]}55`, background:active?QUADRA_COLOURS[q]:'none', color:active?'#fff':QUADRA_COLOURS[q], cursor:'pointer', transition:'all 0.15s' }}>
                        {q}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button type="button" onClick={() => { window.umami?.track('room-header-type-clicked',{type:profile?.type}); setWebviewUrl(`https://socionicsinsight.com/types/${profile?.type?.toLowerCase()}/`) }} style={{ fontSize:'0.68rem', letterSpacing:'0.08em', textTransform:'uppercase', color:quadraColour, border:`1px solid ${quadraColour}44`, padding:'0.25rem 0.6rem', borderRadius:3, background:'none', cursor:'pointer', flexShrink:0 }}>
                {profile?.type} →
              </button>
            </div>

            {/* Active members strip */}
            {activeMembers.length > 0 && (() => {
              const now    = Date.now()
              const online = activeMembers.filter(u => now - new Date(u.last_active).getTime() < 15*60*1000)
              const today  = activeMembers.filter(u => { const diff=now-new Date(u.last_active).getTime(); return diff>=15*60*1000&&diff<24*60*60*1000 })
              const MAX_SHOWN=8, shown=activeMembers.slice(0,MAX_SHOWN), overflow=activeMembers.length-MAX_SHOWN
              return (
                <div style={{ padding:'0.5rem 1.5rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'0.6rem', background:'var(--card-bg)', flexShrink:0, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.25rem' }}>
                    {shown.map(u => {
                      const isOnline = now-new Date(u.last_active).getTime() < 15*60*1000
                      const initial  = (u.profile_data?.name?.[0] ?? u.type?.[0] ?? '?').toUpperCase()
                      const dotColour = isOnline ? '#4caf50' : '#f5a623'
                      return (
                        <div key={u.id} title={`${u.profile_data?.name??u.type} (${u.type})`} style={{ position:'relative', flexShrink:0 }}>
                          <div style={{ width:24, height:24, borderRadius:'50%', overflow:'hidden', border:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:600, color:'var(--accent)' }}>
                            {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : <span>{initial}</span>}
                          </div>
                          <span style={{ position:'absolute', bottom:0, right:0, width:7, height:7, borderRadius:'50%', background:dotColour, border:'1.5px solid var(--card-bg)', display:'block' }} />
                        </div>
                      )
                    })}
                    {overflow>0 && <span style={{ fontSize:'0.68rem', color:'var(--muted)', marginLeft:'0.25rem' }}>+{overflow}</span>}
                  </div>
                  <span style={{ fontSize:'0.72rem', color:'var(--muted)' }}>
                    {online.length>0 && <span style={{ color:'#4caf50', fontWeight:500 }}>{online.length} online now</span>}
                    {online.length>0 && today.length>0 && <span> · </span>}
                    {today.length>0 && <span>{today.length} active in this room today</span>}
                  </span>
                </div>
              )
            })()}

            {/* Load more */}
            {hasMore && (
              <div style={{ padding:'0.5rem', textAlign:'center', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                <button type="button" onClick={loadMore} disabled={loadingMore} style={{ background:'none', border:'none', cursor:loadingMore?'default':'pointer', fontSize:'0.78rem', color:'var(--accent)', padding:'0.25rem', opacity:loadingMore?0.5:1 }}>
                  {loadingMore ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}

            {/* Room notifications prompt — only show on own room */}
            {!isReadOnly && profile && pushSupported && pushPermission!=='denied' && !roomNotifsEnabled && (
              <button type="button" onClick={enableRoomNotifications} disabled={enablingRoomNotif} style={{ display:'flex',alignItems:'center',gap:'0.5rem',width:'100%',padding:'0.6rem 1.5rem',background:'none',border:'none',borderBottom:'1px solid var(--border)',cursor:enablingRoomNotif?'default':'pointer',fontSize:'0.75rem',color:'var(--muted)',textAlign:'left',transition:'color 0.2s',opacity:enablingRoomNotif?0.6:1,flexShrink:0 }} onMouseEnter={e=>{if(!enablingRoomNotif)e.currentTarget.style.color='var(--accent)'}} onMouseLeave={e=>e.currentTarget.style.color='var(--muted)'}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.5a4 4 0 0 1 4 4v2.5l1 1.5H2l1-1.5V5.5a4 4 0 0 1 4-4z"/><path d="M5.5 11a1.5 1.5 0 0 0 3 0"/></svg>
                {enablingRoomNotif ? 'Enabling…' : 'Enable room notifications'}
              </button>
            )}

            {/* Messages */}
            <div ref={listRef} style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.85rem', background:'var(--bg)' }}>
              {roomLoading ? (
                <p style={{ color:'var(--muted)',fontSize:'0.85rem',textAlign:'center',marginTop:'2rem' }}>Loading…</p>
              ) : roomError ? (
                <p style={{ color:'#c0392b',fontSize:'0.85rem',textAlign:'center',marginTop:'2rem' }}>{roomError}</p>
              ) : messages.length === 0 ? (
                <div style={{ textAlign:'center',marginTop:'3rem' }}>
                  <p style={{ fontFamily:'var(--serif)',fontStyle:'italic',fontSize:'1.1rem',color:'var(--muted)',marginBottom:'0.5rem' }}>No messages yet.</p>
                  <p style={{ fontSize:'0.78rem',color:'var(--muted)' }}>Be the first to say something to your {quadra} quadra.</p>
                </div>
              ) : renderMessages()}
              <div ref={bottomRef} />
            </div>

            {/* Errors */}
            {(actionError||sendError||imageUploadError||reportSuccess) && (
              <div style={{ padding:'0.4rem 1.5rem', background:reportSuccess?'rgba(154,111,56,0.07)':'rgba(192,57,43,0.07)', borderTop:'1px solid var(--border)', flexShrink:0 }}>
                <p style={{ fontSize:'0.78rem', color:reportSuccess?'var(--accent)':'#c0392b' }}>
                  {reportSuccess ? 'Report submitted.' : actionError||sendError||imageUploadError}
                </p>
              </div>
            )}

            {/* Input area — gated for read-only (founder viewing another room) */}
            <div style={{ borderTop:'1px solid var(--border)', background:'var(--card-bg)', flexShrink:0 }}>
              {isReadOnly ? (
                <div style={{ padding:'0.75rem 1.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color:'var(--muted)', flexShrink:0 }}><rect x="3" y="6" width="8" height="7" rx="1"/><path d="M5 6V4a2 2 0 0 1 4 0v2"/></svg>
                  <p style={{ fontSize:'0.82rem', color:'var(--muted)', fontStyle:'italic' }}>Viewing {viewingQuadra} room — read only</p>
                </div>
              ) : (
                <>
                  {/* Typing indicator */}
                  {Object.keys(typingUsers).length > 0 && (() => {
                    const entries=Object.values(typingUsers), names=entries.map(u=>u.name)
                    let label
                    if(names.length===1) label=`${names[0]} is typing…`
                    else if(names.length===2) label=`${names[0]} and ${names[1]} are typing…`
                    else label=`${names[0]}, ${names[1]} and ${names.length-2} other${names.length-2>1?'s':''} are typing…`
                    return (
                      <div style={{ padding:'0.3rem 1.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <span style={{ fontSize:'0.72rem',color:'var(--muted)',fontStyle:'italic' }}>{label}</span>
                        <span style={{ display:'flex',gap:'3px',alignItems:'center' }}>
                          {[0,1,2].map(i=><span key={i} style={{ width:4,height:4,borderRadius:'50%',background:'var(--muted)',display:'inline-block',animation:`typingDot 1.2s ${i*0.2}s infinite ease-in-out` }} />)}
                        </span>
                      </div>
                    )
                  })()}

                  {/* Reply bar */}
                  {replyTo && (
                    <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',padding:'0.5rem 1.5rem',borderBottom:'1px solid var(--border)',background:'var(--surface)' }}>
                      <div style={{ flex:1,borderLeft:'2px solid var(--accent)',paddingLeft:'0.5rem' }}>
                        <p style={{ fontSize:'0.7rem',color:'var(--accent)',fontWeight:500,marginBottom:'0.1rem' }}>{replyTo.sender_id===profile?.id?'You':replyTo.senderName}</p>
                        {replyTo.image_url && !replyTo.content && <p style={{ fontSize:'0.72rem',color:'var(--muted)' }}>🖼 Image</p>}
                        {replyTo.content && <p style={{ fontSize:'0.75rem',color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:320 }}>{replyTo.content}</p>}
                      </div>
                      <button type="button" onClick={() => setReplyTo(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,flexShrink:0 }} aria-label="Cancel reply">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
                      </button>
                    </div>
                  )}

                  <div style={{ padding:isMobile?'0.6rem 0.75rem':'1rem 1.5rem' }}>
                    {isAnonymous ? (
                      <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',background:'var(--surface)',borderRadius:4,border:'1px solid var(--border)' }}>
                        <span style={{ fontSize:'0.85rem',color:'var(--muted)' }}>🕵️ Anonymous mode — switch to your profile to chat in the room.</span>
                        <Link to="/profile/edit" style={{ fontSize:'0.78rem',color:'var(--accent)',textDecoration:'none',flexShrink:0 }}>Edit profile →</Link>
                      </div>
                    ) : (
                      <>
                        {/* Pending image preview */}
                        {pendingImage && (
                          <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem',padding:'0.5rem 0.75rem',background:'rgba(154,111,56,0.05)',border:'1px solid var(--accent-lt)',borderRadius:4 }}>
                            <div style={{ flexShrink:0 }}>
                              <img src={pendingImage.previewUrl} alt="pending" style={{ height:56,maxWidth:80,objectFit:'cover',borderRadius:4,border:'1px solid var(--border)',display:'block' }} />
                            </div>
                            <span style={{ fontSize:'0.78rem',color:'var(--muted)',flex:1 }}>Add a caption or hit Send</span>
                            <button type="button" onClick={handleClearPendingImage} aria-label="Remove image" style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,flexShrink:0 }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
                            </button>
                          </div>
                        )}

                        {imageUploading && (
                          <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem',padding:'0.4rem 0.75rem',background:'rgba(154,111,56,0.07)',borderRadius:4,border:'1px solid var(--accent-lt)' }}>
                            <span style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(154,111,56,0.25)',borderTopColor:'var(--accent)',animation:'bootSpin 0.8s linear infinite',flexShrink:0 }} />
                            <span style={{ fontSize:'0.78rem',color:'var(--accent)' }}>Uploading image…</span>
                          </div>
                        )}

                        {/* Text input row */}
                        <div style={{ display:'flex',alignItems:'flex-end',border:'1px solid var(--border)',borderRadius:4,overflow:'hidden',background:'var(--card-bg)',transition:'border-color 0.2s' }} onFocusCapture={e=>e.currentTarget.style.borderColor='var(--accent)'} onBlurCapture={e=>e.currentTarget.style.borderColor='var(--border)'}>
                          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={imageUploading||sending} title="Share image or GIF" aria-label="Attach image" style={{ background:'none',border:'none',padding:isMobile?'0.7rem 0.5rem 0.7rem 0.75rem':'0.9rem 0.5rem 0.9rem 1rem',cursor:(imageUploading||sending)?'default':'pointer',color:pendingImage?'var(--accent)':'var(--muted)',flexShrink:0,alignSelf:'flex-end',opacity:(imageUploading||sending)?0.4:1,transition:'color 0.15s, opacity 0.15s',lineHeight:0 }} onMouseEnter={e=>{if(!imageUploading&&!sending)e.currentTarget.style.color='var(--accent)'}} onMouseLeave={e=>e.currentTarget.style.color=pendingImage?'var(--accent)':'var(--muted)'}>
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="16" height="13" rx="2"/><circle cx="7" cy="9" r="1.5"/><polyline points="2,17 7,11 11,15 14,12 18,17"/></svg>
                          </button>
                          <input ref={imageInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} onChange={handleImageFileChange} style={{ display:'none' }} />
                          <textarea ref={inputRef} placeholder={pendingImage?'Add a caption (optional)…':`Message the ${quadra} quadra…`} value={text} rows={1} maxLength={2000}
                            onChange={e => {
                              setText(e.target.value)
                              e.target.style.height='auto'; e.target.style.height=`${e.target.scrollHeight}px`
                              typingChannel.current?.send({ type:'broadcast',event:'typing',payload:{ tab_id:tabId.current,user_id:profile.id,name:profile.profile_data?.anonymous?'Anonymous':(profile.profile_data?.name??profile.type),user_type:profile.type,typing:true } })
                              clearTimeout(typingTimer.current)
                              typingTimer.current = setTimeout(() => { typingChannel.current?.send({ type:'broadcast',event:'typing',payload:{ tab_id:tabId.current,user_id:profile.id,typing:false } }) }, 2000)
                            }}
                            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()} }}
                            style={{ flex:1,resize:'none',overflow:'hidden',lineHeight:1.5,fontFamily:'var(--sans)',fontSize:isMobile?'0.85rem':'0.92rem',fontWeight:300,color:'var(--text)',background:'transparent',border:'none',outline:'none',padding:isMobile?'0.7rem 0.4rem':'0.9rem 0.5rem',maxHeight:'8rem' }}
                          />
                          {text.length>1800 && <span style={{ fontSize:'0.68rem',color:'var(--muted)',padding:'0 0.5rem 0.75rem',alignSelf:'flex-end' }}>{2000-text.length}</span>}
                          <button className="btn-primary" onClick={handleSend} disabled={(!text.trim()&&!pendingImage)||sending||imageUploading} style={{ borderRadius:0,alignSelf:'stretch',opacity:((!text.trim()&&!pendingImage)||sending||imageUploading)?0.5:1 }}>Send</button>
                        </div>
                        {text && <p style={{ fontSize:'0.68rem',color:'var(--muted)',textAlign:'right',margin:'0.25rem 0.5rem 0' }}>Shift + Enter for new line</p>}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {reportTarget && <ReportModal onSubmit={handleReport} onClose={() => setReportTarget(null)} submitting={reporting} />}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'zoom-out' }}>
          <img src={lightboxUrl} alt="shared image" crossOrigin="anonymous" style={{ maxWidth:'92vw',maxHeight:'90vh',objectFit:'contain',borderRadius:6 }} onClick={e=>e.stopPropagation()} />
          <button type="button" onClick={() => setLightboxUrl(null)} style={{ position:'fixed',top:'1.5rem',right:'1.5rem',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:36,height:36,color:'#fff',fontSize:'1.2rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
        </div>
      )}

      <SIWebview url={webviewUrl} onClose={() => setWebviewUrl(null)} />
    </Layout>
  )
}

const centreStyle  = { minHeight:'calc(100vh - 72px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1.25rem',padding:'2rem',textAlign:'center' }
const overlayStyle = { position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem' }
const modalStyle   = { background:'var(--card-bg)',borderRadius:6,padding:'2rem',width:'100%',maxWidth:420,boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }
const iconBtnStyle = { background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:'0.25rem',lineHeight:1,flexShrink:0 }
