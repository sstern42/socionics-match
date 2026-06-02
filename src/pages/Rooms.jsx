import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useQuadraRoom } from '../hooks/useQuadraRoom'
import { supabase } from '../lib/supabase'
import { getQuadra } from '../data/relations'
import SIWebview from '../components/SIWebview'

// ── Constants ────────────────────────────────────────────────

const QUADRA_COLOURS = {
  Alpha: '#BA7517',
  Beta:  '#791F1F',
  Gamma: '#0F6E56',
  Delta: '#185FA5',
}

const ROOM_LAST_VISITED_KEY = 'socion_room_last_visited'

export function markRoomVisited() {
  localStorage.setItem(ROOM_LAST_VISITED_KEY, new Date().toISOString())
}

export function getRoomLastVisited() {
  return localStorage.getItem(ROOM_LAST_VISITED_KEY)
}

// ── Helpers ──────────────────────────────────────────────────

function getSenderName(msg) {
  if (msg.sender?.profile_data?.anonymous) return 'Anonymous'
  return msg.sender?.profile_data?.name ?? msg.sender?.type ?? 'Unknown'
}

function timeStr(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function dateDividerLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now - 86400000)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

// ── RoomMessage ───────────────────────────────────────────────

function RoomMessage({
  msg, isMine, currentUserId,
  onReply, onEdit, onReport, onTypeClick,
  editingId, editText, setEditText, onEditSave, onEditCancel,
  deleteConfirmId, setDeleteConfirmId, deleting, onDeleteConfirm,
  isMobile,
}) {
  const [hovered, setHovered] = useState(false)
  const longPressTimer = useRef(null)

  const isDeleted    = !!msg.deleted_at
  const isOptimistic = !!msg._optimistic
  const isEditing    = editingId === msg.id
  const isDeleteConfirm = deleteConfirmId === msg.id

  const senderName   = getSenderName(msg)
  const senderType   = msg.sender?.type ?? '?'
  const isAnon       = msg.sender?.profile_data?.anonymous ?? false
  const senderId     = msg.sender?.id
  const quadra       = getQuadra(senderType)
  const badgeColour  = QUADRA_COLOURS[quadra] ?? 'var(--accent)'

  const replyMsg    = msg.reply_to
  const replySender = replyMsg
    ? (replyMsg.sender?.profile_data?.name ?? replyMsg.sender?.type ?? 'Unknown')
    : null

  function startLongPress() {
    longPressTimer.current = setTimeout(() => {
      if (!isDeleted) onReply({ id: msg.id, content: msg.content, sender_id: msg.sender_id, senderName })
    }, 500)
  }
  function cancelLongPress() { clearTimeout(longPressTimer.current) }

  const showActions = (hovered || isMobile) && !isDeleted && !isOptimistic

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', opacity: isOptimistic ? 0.6 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Sender row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

        {/* Name — links to profile if not anonymous */}
        {senderId && !isAnon ? (
          <Link
            to={`/profile/${senderId}`}
            onClick={() => window.umami?.track('room-sender-name-clicked')}
            style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text)'}
          >
            {senderName}
          </Link>
        ) : (
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)' }}>{senderName}</span>
        )}

        {/* Type badge — opens SI webview */}
        <button
          type="button"
          onClick={() => onTypeClick(`https://socionicsinsight.com/types/${senderType.toLowerCase()}/`)}
          style={{
            fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            fontWeight: 600, color: badgeColour,
            border: `1px solid ${badgeColour}44`,
            padding: '0.1rem 0.4rem', borderRadius: 2,
            background: 'none', cursor: 'pointer',
          }}
        >{senderType}</button>

        {msg.sender?.verified_by && (
          <span title={`Verified by ${msg.sender.verified_by}`} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 11, height: 11, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            fontSize: '0.4rem', fontWeight: 700, lineHeight: 1,
          }}>✓</span>
        )}

        <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginLeft: 'auto', flexShrink: 0 }}>
          {timeStr(msg.created_at)}{msg.edited_at && !isDeleted ? ' · edited' : ''}
        </span>
      </div>

      {/* Bubble row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexDirection: isMine ? 'row-reverse' : 'row' }}>

        {/* Bubble */}
        <div
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          style={{
            background: isMine ? 'var(--accent)' : '#fff',
            color: isMine ? '#fff' : isDeleted ? 'var(--muted)' : 'var(--text)',
            border: `1px solid ${isMine ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
            padding: '0.6rem 0.9rem',
            fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 300,
            fontStyle: isDeleted ? 'italic' : 'normal',
            maxWidth: '75%',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        >
          {/* Reply quote */}
          {replyMsg && !isDeleted && (
            <div style={{
              borderLeft: `2px solid ${isMine ? 'rgba(255,255,255,0.5)' : 'var(--accent-lt)'}`,
              paddingLeft: '0.5rem', marginBottom: '0.5rem', opacity: 0.8,
            }}>
              <p style={{ fontSize: '0.72rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginBottom: '0.1rem', fontWeight: 500 }}>
                {replyMsg.sender_id === currentUserId ? 'You' : replySender}
              </p>
              <p style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {replyMsg.content}
              </p>
            </div>
          )}

          {/* Content or edit input */}
          {isEditing ? (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 180 }}>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditSave(msg.id) }
                  if (e.key === 'Escape') onEditCancel()
                }}
                autoFocus
                style={{
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6, padding: '0.4rem 0.6rem', fontSize: '0.9rem',
                  color: '#fff', resize: 'none', fontFamily: 'var(--sans)',
                  lineHeight: 1.5, minHeight: 60,
                }}
              />
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button type="button" onClick={() => onEditSave(msg.id)} disabled={!editText.trim()} style={{ background: '#fff', color: 'var(--accent)', border: 'none', borderRadius: 4, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer', opacity: editText.trim() ? 1 : 0.5 }}>Save</button>
                <button type="button" onClick={onEditCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', padding: '0.2rem' }}>Cancel</button>
              </div>
            </div>
          ) : (
            isDeleted ? '[message removed]' : msg.content
          )}
        </div>

        {/* Action icons */}
        {!isDeleted && !isEditing && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            flexDirection: isMine ? 'row-reverse' : 'row',
            opacity: showActions ? 1 : (isMobile ? 0.25 : 0),
            transition: 'opacity 0.15s',
            pointerEvents: showActions ? 'auto' : (isMobile ? 'auto' : 'none'),
          }}>
            <button type="button" onClick={() => onReply({ id: msg.id, content: msg.content, sender_id: msg.sender_id, senderName })} aria-label="Reply" style={iconBtnStyle}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,3 1,6 4,9"/><path d="M1 6h7a5 5 0 0 1 5 5v1"/></svg>
            </button>
            {isMine && (
              <button type="button" onClick={() => onEdit(msg.id, msg.content)} aria-label="Edit" style={iconBtnStyle}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11H3v-2L9.5 2.5z"/></svg>
              </button>
            )}
            {isMine && (
              isDeleteConfirm ? (
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <button type="button" onClick={() => onDeleteConfirm(msg.id)} disabled={deleting} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.68rem', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}>{deleting ? '…' : 'Delete'}</button>
                  <button type="button" onClick={() => setDeleteConfirmId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.68rem', padding: '0.2rem' }}>Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setDeleteConfirmId(msg.id)} aria-label="Delete" style={iconBtnStyle}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,3 12,3"/><path d="M5,3V2h4v1"/><rect x="3" y="3" width="8" height="10" rx="1"/><line x1="6" y1="6" x2="6" y2="10"/><line x1="8" y1="6" x2="8" y2="10"/></svg>
                </button>
              )
            )}
            {!isMine && (
              <button type="button" onClick={() => onReport(msg.id)} aria-label="Report" style={iconBtnStyle}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h10l-2 5 2 5H2V2z"/></svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Report modal ──────────────────────────────────────────────

function ReportModal({ onSubmit, onClose, submitting }) {
  const [reason, setReason] = useState('')
  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={modalStyle}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginBottom: '0.75rem' }}>Report message</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>Reports are reviewed by the founder. Your identity is not shared.</p>
        <textarea className="input-standalone" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ resize: 'none', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '1rem' }} />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => onSubmit(reason || null)} disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>{submitting ? 'Submitting…' : 'Submit report'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────

export default function Rooms() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  const {
    roomId, messages,
    loading: roomLoading, error: roomError,
    hasMore, loadMore, loadingMore,
    send, sending, sendError,
    edit, softDelete, report,
  } = useQuadraRoom({ profile })

  const [text, setText]                       = useState('')
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
  const [isMobile, setIsMobile]               = useState(() => window.innerWidth <= 700)

  const bottomRef        = useRef(null)
  const inputRef         = useRef(null)
  const listRef          = useRef(null)
  const prevScrollHeight = useRef(0)

  const quadra       = profile?.type ? getQuadra(profile.type) : null
  const quadraColour = QUADRA_COLOURS[quadra] ?? 'var(--accent)'
  const isAnonymous  = profile?.profile_data?.anonymous ?? false

  useEffect(() => { if (!loading && !session) navigate('/auth') }, [session, loading])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)')
    const h = e => setIsMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    markRoomVisited()
    window.dispatchEvent(new Event('socion-room-visited'))
  }, [])

  useEffect(() => {
    document.body.classList.add('messages-page')
    return () => document.body.classList.remove('messages-page')
  }, [])

  useEffect(() => {
    if (!roomId) return
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('room_id', roomId).then(({ count }) => setMemberCount(count))
  }, [roomId])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || messages[messages.length - 1]?._optimistic) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

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
    if (!roomLoading && messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [roomLoading])

  async function handleSend() {
    if (!text.trim() || sending) return
    const content = text
    const replyToId = replyTo?.id ?? null
    setText('')
    setReplyTo(null)
    inputRef.current?.focus()
    await send(content, replyToId)
  }

  function handleStartEdit(messageId, currentContent) {
    setEditingId(messageId)
    setEditText(currentContent)
    setDeleteConfirmId(null)
  }

  async function handleEditSave(messageId) {
    if (!editText.trim()) return
    try {
      await edit(messageId, editText)
      setEditingId(null)
      setEditText('')
    } catch { setActionError('Could not save edit — try again.') }
  }

  async function handleDeleteConfirm(messageId) {
    setDeleting(true)
    setActionError(null)
    try {
      await softDelete(messageId)
      setDeleteConfirmId(null)
    } catch { setActionError('Could not delete that message — try again.') }
    finally { setDeleting(false) }
  }

  async function handleReport(reason) {
    if (!reportTarget) return
    setReporting(true)
    try {
      await report({ messageId: reportTarget, reason })
      setReportTarget(null)
      setReportSuccess(true)
      setTimeout(() => setReportSuccess(false), 3000)
    } catch { /* non-fatal */ }
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
          <div key={`divider-${msg.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', flexShrink: 0 }}>{dateDividerLabel(msg.created_at)}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )
      }
      items.push(
        <RoomMessage
          key={msg.id}
          msg={msg}
          isMine={msg.sender_id === profile?.id}
          currentUserId={profile?.id}
          isMobile={isMobile}
          onReply={setReplyTo}
          onEdit={handleStartEdit}
          onReport={id => setReportTarget(id)}
          onTypeClick={url => { window.umami?.track('room-type-badge-clicked'); setWebviewUrl(url) }}
          editingId={editingId}
          editText={editText}
          setEditText={setEditText}
          onEditSave={handleEditSave}
          onEditCancel={() => { setEditingId(null); setEditText('') }}
          deleteConfirmId={deleteConfirmId}
          setDeleteConfirmId={setDeleteConfirmId}
          deleting={deleting}
          onDeleteConfirm={handleDeleteConfirm}
        />
      )
    }
    return items
  }

  if (!loading && profile && !profile.type) {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}>
          <p className="eyebrow">Quadra rooms</p>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.75rem', marginTop: '0.5rem' }}>Set your type to join a room</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', maxWidth: 380, textAlign: 'center', lineHeight: 1.7 }}>Set your Socionics type to be assigned to your quadra room.</p>
          <Link to="/profile/edit" className="btn-primary" style={{ textDecoration: 'none' }}>Set your type →</Link>
        </section>
      </Layout>
    )
  }

  if (!loading && profile && !roomId) {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}><p style={{ color: 'var(--muted)' }}>Assigning your room…</p></section>
      </Layout>
    )
  }

  return (
    <Layout hideFooter noScroll>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div className="messages-outer" style={{ maxWidth: 720, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', padding: '0 1.5rem', minHeight: 0, boxSizing: 'border-box' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderLeft: isMobile ? 'none' : undefined, borderRight: isMobile ? 'none' : undefined, borderTop: 'none', background: '#fff', overflow: 'hidden', minHeight: 0 }}>

            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: quadraColour, flexShrink: 0, display: 'inline-block' }} />
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 500, margin: 0, color: quadraColour }}>{quadra} quadra</h2>
                  {memberCount != null && <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>· {memberCount} {memberCount === 1 ? 'member' : 'members'}</span>}
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{profile?.type} — your quadra room</p>
              </div>
              {/* Header type badge → opens SI webview */}
              <button
                type="button"
                onClick={() => { window.umami?.track('room-header-type-clicked', { type: profile?.type }); setWebviewUrl(`https://socionicsinsight.com/types/${profile?.type?.toLowerCase()}/`) }}
                style={{
                  fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: quadraColour, border: `1px solid ${quadraColour}44`,
                  padding: '0.25rem 0.6rem', borderRadius: 3, background: 'none',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >{profile?.type} →</button>
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <button type="button" onClick={loadMore} disabled={loadingMore} style={{ background: 'none', border: 'none', cursor: loadingMore ? 'default' : 'pointer', fontSize: '0.78rem', color: 'var(--accent)', padding: '0.25rem', opacity: loadingMore ? 0.5 : 1 }}>
                  {loadingMore ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}

            {/* Messages */}
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--bg)' }}>
              {roomLoading ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Loading…</p>
              ) : roomError ? (
                <p style={{ color: '#c0392b', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>{roomError}</p>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                  <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>No messages yet.</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Be the first to say something to your {quadra} quadra.</p>
                </div>
              ) : renderMessages()}
              <div ref={bottomRef} />
            </div>

            {/* Errors */}
            {(actionError || sendError || reportSuccess) && (
              <div style={{ padding: '0.4rem 1.5rem', background: reportSuccess ? 'rgba(154,111,56,0.07)' : 'rgba(192,57,43,0.07)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <p style={{ fontSize: '0.78rem', color: reportSuccess ? 'var(--accent)' : '#c0392b' }}>
                  {reportSuccess ? 'Report submitted.' : actionError || sendError}
                </p>
              </div>
            )}

            {/* Input */}
            <div style={{ borderTop: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
              {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div style={{ flex: 1, borderLeft: '2px solid var(--accent)', paddingLeft: '0.5rem' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.1rem' }}>{replyTo.sender_id === profile?.id ? 'You' : replyTo.senderName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{replyTo.content}</p>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', lineHeight: 1, flexShrink: 0 }} aria-label="Cancel reply">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
                  </button>
                </div>
              )}
              <div style={{ padding: isMobile ? '0.6rem 0.75rem' : '1rem 1.5rem' }}>
                {isAnonymous ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: 4, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>🕵️ Anonymous mode — switch to your profile to chat in the room.</span>
                    <Link to="/profile/edit" style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', flexShrink: 0 }}>Edit profile →</Link>
                  </div>
                ) : (
                  <>
                    <div
                      style={{ display: 'flex', alignItems: 'flex-end', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: '#fff', transition: 'border-color 0.2s' }}
                      onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <textarea
                        ref={inputRef}
                        placeholder={`Message the ${quadra} quadra…`}
                        value={text} rows={1} maxLength={2000}
                        onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px` }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        style={{ flex: 1, resize: 'none', overflow: 'hidden', lineHeight: 1.5, fontFamily: 'var(--sans)', fontSize: isMobile ? '0.85rem' : '0.92rem', fontWeight: 300, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', padding: isMobile ? '0.7rem 0.9rem' : '0.9rem 1.25rem', maxHeight: '8rem' }}
                      />
                      {text.length > 1800 && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', padding: '0 0.5rem 0.75rem', alignSelf: 'flex-end' }}>{2000 - text.length}</span>}
                      <button className="btn-primary" onClick={handleSend} disabled={!text.trim() || sending} style={{ borderRadius: 0, alignSelf: 'stretch', opacity: (!text.trim() || sending) ? 0.5 : 1 }}>Send</button>
                    </div>
                    {text && <p style={{ fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'right', margin: '0.25rem 0.5rem 0' }}>Shift + Enter for new line</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {reportTarget && <ReportModal onSubmit={handleReport} onClose={() => setReportTarget(null)} submitting={reporting} />}
      <SIWebview url={webviewUrl} onClose={() => setWebviewUrl(null)} />
    </Layout>
  )
}

const centreStyle = { minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '2rem', textAlign: 'center' }
const overlayStyle = { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }
const modalStyle = { background: '#fff', borderRadius: 6, padding: '2rem', width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', lineHeight: 1, flexShrink: 0 }
