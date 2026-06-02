import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useQuadraRoom } from '../hooks/useQuadraRoom'
import { supabase } from '../lib/supabase'
import { getQuadra } from '../data/relations'

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
  const isAnon = msg.sender?.profile_data?.anonymous ?? false
  if (isAnon) return 'Anonymous'
  return msg.sender?.profile_data?.name ?? msg.sender?.type ?? 'Unknown'
}

function timeStr(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
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

// ── Message component ─────────────────────────────────────────

function RoomMessage({ msg, isMine, quadraColour, onDelete, onReport }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isDeleted  = !!msg.deleted_at
  const isOptimistic = !!msg._optimistic
  const senderName = getSenderName(msg)
  const senderType = msg.sender?.type ?? '?'
  const senderQuadra = getQuadra(senderType)
  const badgeColour = QUADRA_COLOURS[senderQuadra] ?? 'var(--accent)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        opacity: isOptimistic ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Sender row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)' }}>
          {senderName}
        </span>
        <span style={{
          fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          fontWeight: 600, color: badgeColour,
          border: `1px solid ${badgeColour}44`,
          padding: '0.1rem 0.4rem', borderRadius: 2,
        }}>
          {senderType}
        </span>
        {msg.sender?.verified_by && (
          <span title={`Verified by ${msg.sender.verified_by}`} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 11, height: 11, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            fontSize: '0.4rem', fontWeight: 700, lineHeight: 1,
          }}>✓</span>
        )}
        <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginLeft: 'auto' }}>
          {timeStr(msg.created_at)}
        </span>
        {/* Menu */}
        {!isDeleted && (
          <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: '0.9rem', padding: '0 0.2rem',
                lineHeight: 1, opacity: 0.5,
              }}
              aria-label="Message options"
            >
              ···
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%',
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 4, minWidth: 130, zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                {isMine && (
                  <button
                    type="button"
                    onClick={() => { onDelete(msg.id); setMenuOpen(false) }}
                    style={menuItemStyle}
                  >
                    Delete
                  </button>
                )}
                {!isMine && (
                  <button
                    type="button"
                    onClick={() => { onReport(msg.id); setMenuOpen(false) }}
                    style={menuItemStyle}
                  >
                    Report
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div style={{
        background: isMine ? 'var(--accent)' : '#fff',
        color: isMine ? '#fff' : isDeleted ? 'var(--muted)' : 'var(--text)',
        border: `1px solid ${isMine ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        padding: '0.6rem 0.9rem',
        fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 300,
        fontStyle: isDeleted ? 'italic' : 'normal',
        maxWidth: '80%',
        alignSelf: isMine ? 'flex-end' : 'flex-start',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {isDeleted ? '[message removed]' : msg.content}
      </div>
    </div>
  )
}

// ── Report modal ─────────────────────────────────────────────

function ReportModal({ onSubmit, onClose, submitting }) {
  const [reason, setReason] = useState('')

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={modalStyle}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
          Report message
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
          Reports are reviewed by the founder. The reporter's identity is not shared.
        </p>
        <textarea
          className="input-standalone"
          placeholder="Reason (optional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          style={{ resize: 'none', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '1rem' }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSubmit(reason || null)}
            disabled={submitting}
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
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
    roomId,
    messages,
    loading: roomLoading,
    error: roomError,
    hasMore,
    loadMore,
    loadingMore,
    send,
    sending,
    sendError,
    softDelete,
    report,
  } = useQuadraRoom({ profile })

  const [text, setText]               = useState('')
  const [memberCount, setMemberCount] = useState(null)
  const [reportTarget, setReportTarget] = useState(null) // message id
  const [reporting, setReporting]     = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const listRef     = useRef(null)
  const prevScrollHeight = useRef(0)

  const quadra = profile?.type ? getQuadra(profile.type) : null
  const quadraColour = QUADRA_COLOURS[quadra] ?? 'var(--accent)'
  const isAnonymous = profile?.profile_data?.anonymous ?? false

  // Auth guard
  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  // Mark visited + clear unread dot
  useEffect(() => {
    markRoomVisited()
    window.dispatchEvent(new Event('socion-room-visited'))
  }, [])

  // Member count
  useEffect(() => {
    if (!roomId) return
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .then(({ count }) => setMemberCount(count))
  }, [roomId])

  // Auto-scroll to bottom on new messages (only if already near bottom)
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || messages[messages.length - 1]?._optimistic) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Preserve scroll position when prepending older messages
  useEffect(() => {
    if (!listRef.current || !loadingMore) return
    prevScrollHeight.current = listRef.current.scrollHeight
  }, [loadingMore])

  useEffect(() => {
    if (!listRef.current || loadingMore) return
    const el = listRef.current
    const diff = el.scrollHeight - prevScrollHeight.current
    if (diff > 0) el.scrollTop += diff
  }, [messages, loadingMore])

  // Initial scroll to bottom once messages load
  useEffect(() => {
    if (!roomLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [roomLoading])

  async function handleSend() {
    if (!text.trim() || sending) return
    const content = text
    setText('')
    inputRef.current?.focus()
    await send(content)
  }

  async function handleDelete(messageId) {
    setDeleteError(null)
    try {
      await softDelete(messageId)
    } catch {
      setDeleteError('Could not delete that message — try again.')
    }
  }

  async function handleReport(reason) {
    if (!reportTarget) return
    setReporting(true)
    try {
      await report({ messageId: reportTarget, reason })
      setReportTarget(null)
      setReportSuccess(true)
      setTimeout(() => setReportSuccess(false), 3000)
    } catch {
      // Non-fatal
    } finally {
      setReporting(false)
    }
  }

  // Build message list with date dividers
  function renderMessages() {
    const items = []
    let lastDateStr = null

    for (const msg of messages) {
      const dateStr = new Date(msg.created_at).toDateString()
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr
        items.push(
          <div key={`divider-${msg.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{
              fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--muted)', flexShrink: 0,
            }}>
              {dateDividerLabel(msg.created_at)}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        )
      }

      items.push(
        <RoomMessage
          key={msg.id}
          msg={msg}
          isMine={msg.sender_id === profile?.id}
          quadraColour={quadraColour}
          onDelete={handleDelete}
          onReport={(id) => setReportTarget(id)}
        />
      )
    }

    return items
  }

  // ── No type set ──────────────────────────────────────────────
  if (!loading && profile && !profile.type) {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}>
          <p className="eyebrow">Quadra rooms</p>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.75rem', marginTop: '0.5rem' }}>
            Set your type to join a room
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', maxWidth: 380, textAlign: 'center', lineHeight: 1.7 }}>
            Each quadra room is open to its four types. Set your Socionics type to be assigned to your room.
          </p>
          <Link to="/profile/edit" className="btn-primary" style={{ textDecoration: 'none' }}>
            Set your type →
          </Link>
        </section>
      </Layout>
    )
  }

  // ── Room not assigned yet (edge case during retype) ──────────
  if (!loading && profile && !roomId) {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Assigning your room…</p>
        </section>
      </Layout>
    )
  }

  return (
    <Layout hideFooter noScroll>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <div style={{
          maxWidth: 720, width: '100%', margin: '0 auto',
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '0 1.5rem', minHeight: 0, boxSizing: 'border-box',
        }}>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)', borderTop: 'none',
            background: '#fff', overflow: 'hidden', minHeight: 0,
          }}>

            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              background: '#fff', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{
                    display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                    background: quadraColour, flexShrink: 0,
                  }} />
                  <h2 style={{
                    fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 500, margin: 0,
                    color: quadraColour,
                  }}>
                    {quadra} quadra
                  </h2>
                  {memberCount != null && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      · {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem', letterSpacing: '0.04em' }}>
                  {profile?.type} — your quadra room
                </p>
              </div>
              <a
                href={`https://socionicsinsight.com/types/${profile?.type?.toLowerCase()}/`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: quadraColour, border: `1px solid ${quadraColour}44`,
                  padding: '0.25rem 0.6rem', borderRadius: 3, textDecoration: 'none', flexShrink: 0,
                }}
                onClick={() => window.umami?.track('rooms-type-link-clicked', { type: profile?.type })}
              >
                {profile?.type} →
              </a>
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    background: 'none', border: 'none', cursor: loadingMore ? 'default' : 'pointer',
                    fontSize: '0.78rem', color: 'var(--accent)', padding: '0.25rem',
                    opacity: loadingMore ? 0.5 : 1,
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}

            {/* Message list */}
            <div
              ref={listRef}
              style={{
                flex: 1, overflowY: 'auto',
                padding: '1.25rem 1.5rem',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                background: 'var(--bg)',
              }}
            >
              {roomLoading ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                  Loading…
                </p>
              ) : roomError ? (
                <p style={{ color: '#c0392b', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>
                  {roomError}
                </p>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                  <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                    No messages yet.
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    Be the first to say something to your {quadra} quadra.
                  </p>
                </div>
              ) : (
                renderMessages()
              )}
              <div ref={bottomRef} />
            </div>

            {/* Errors */}
            {(deleteError || sendError || reportSuccess) && (
              <div style={{ padding: '0.4rem 1.5rem', background: reportSuccess ? 'rgba(154,111,56,0.07)' : 'rgba(192,57,43,0.07)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <p style={{ fontSize: '0.78rem', color: reportSuccess ? 'var(--accent)' : '#c0392b' }}>
                  {reportSuccess ? 'Report submitted.' : deleteError || sendError}
                </p>
              </div>
            )}

            {/* Input */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.5rem', background: '#fff', flexShrink: 0 }}>
              {isAnonymous ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', background: 'var(--surface)',
                  borderRadius: 4, border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    🕵️ Anonymous mode — switch to your profile to chat in the room.
                  </span>
                  <Link
                    to="/profile/edit"
                    style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', flexShrink: 0 }}
                  >
                    Edit profile →
                  </Link>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'flex-end',
                  border: '1px solid var(--border)', borderRadius: 4,
                  overflow: 'hidden', background: '#fff', transition: 'border-color 0.2s',
                }}
                  onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <textarea
                    ref={inputRef}
                    placeholder={`Message the ${quadra} quadra…`}
                    value={text}
                    rows={1}
                    maxLength={2000}
                    onChange={e => {
                      setText(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${e.target.scrollHeight}px`
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    style={{
                      flex: 1, resize: 'none', overflow: 'hidden', lineHeight: 1.5,
                      fontFamily: 'var(--sans)', fontSize: '0.92rem', fontWeight: 300,
                      color: 'var(--text)', background: 'transparent',
                      border: 'none', outline: 'none',
                      padding: '0.9rem 1.25rem', maxHeight: '8rem',
                    }}
                  />
                  {text.length > 1800 && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', padding: '0 0.5rem 0.75rem', alignSelf: 'flex-end' }}>
                      {2000 - text.length}
                    </span>
                  )}
                  <button
                    className="btn-primary"
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    style={{ borderRadius: 0, alignSelf: 'stretch', opacity: (!text.trim() || sending) ? 0.5 : 1 }}
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report modal */}
      {reportTarget && (
        <ReportModal
          onSubmit={handleReport}
          onClose={() => setReportTarget(null)}
          submitting={reporting}
        />
      )}
    </Layout>
  )
}

// ── Styles ────────────────────────────────────────────────────

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: '1.25rem', padding: '2rem', textAlign: 'center',
}

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '2rem',
}

const modalStyle = {
  background: '#fff', borderRadius: 6, padding: '2rem',
  width: '100%', maxWidth: 420,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
}

const menuItemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text)',
}
