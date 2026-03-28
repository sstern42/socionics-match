import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RELATIONS } from '../../data/relations'
import { getMessages, sendMessage, subscribeToMessages } from '../../lib/messages'
import { coolOff, hardBlock, getBlockBetween, liftBlock } from '../../lib/blocks'
import { markMatchRead } from '../../lib/useUnreadCount'

export default function Conversation({ match, currentUserId, hasFeedback, onBack }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState(null) // 'cooloff' | 'block' | null
  const [blockReason, setBlockReason] = useState('spam')
  const [blockNotes, setBlockNotes] = useState('')
  const [blockError, setBlockError] = useState(null)
  const [blocking, setBlocking] = useState(false)
  const [activeBlock, setActiveBlock] = useState(null)
  const [replyTo, setReplyTo] = useState(null) // { id, content, sender_id }
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const longPressTimer = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  const relInfo = RELATIONS[match.displayRelationType ?? match.relation_type]
  const otherName = match.other.profile_data?.name ?? match.other.type
  const otherUserId = match.other.id

  // Load active block between these two users
  useEffect(() => {
    getBlockBetween(currentUserId, otherUserId).then(setActiveBlock).catch(() => {})
  }, [match.id])

  useEffect(() => {
    setMessages([])
    setLoading(true)
    let cancelled = false
    getMessages(match.id).then(msgs => {
      if (!cancelled) { setMessages(msgs); setLoading(false); markMatchRead(match.id) }
    })
    const channel = subscribeToMessages(match.id, newMsg => {
      if (!cancelled) {
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        markMatchRead(match.id)
      }
    })
    return () => { cancelled = true; channel.unsubscribe() }
  }, [match.id])

  useEffect(() => {
    const wasInputFocused = document.activeElement === inputRef.current
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    if (wasInputFocused) inputRef.current?.focus()
  }, [messages])

  useEffect(() => {
    if (!sending) inputRef.current?.focus()
  }, [sending])

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    const replyToId = replyTo?.id ?? null
    setReplyTo(null)
    try {
      const msg = await sendMessage({ matchId: match.id, senderId: currentUserId, content: text.trim(), replyToId })
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      setText('')
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  async function handleCoolOff() {
    setBlocking(true)
    setBlockError(null)
    try {
      await coolOff(currentUserId, otherUserId)
      const block = await getBlockBetween(currentUserId, otherUserId)
      setActiveBlock(block)
      setModal(null)
      setMenuOpen(false)
    } catch (err) {
      setBlockError(err.message)
    } finally {
      setBlocking(false)
    }
  }

  async function handleHardBlock() {
    setBlocking(true)
    setBlockError(null)
    try {
      await hardBlock(currentUserId, otherUserId, blockReason, blockNotes)
      navigate('/messages', { replace: true })
    } catch (err) {
      setBlockError(err.message)
      setBlocking(false)
    }
  }

  async function handleLiftBlock() {
    if (!activeBlock) return
    try {
      await liftBlock(activeBlock.id)
      setActiveBlock(null)
    } catch (err) {
      console.error('Failed to lift block:', err)
    }
  }

  const isCoolingOff = activeBlock?.type === 'cooloff'
  const isBlocked = activeBlock?.type === 'block'
  const coolingOffUntil = isCoolingOff && activeBlock.expires_at
    ? new Date(activeBlock.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null
  const iBlockedThem = activeBlock?.blocker_id === currentUserId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Mobile header — compact nav bar */}
      <div className="convo-header-mobile show-mobile">
        {onBack && (
          <button className="convo-back-btn" onClick={onBack} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11,4 6,9 11,14"/>
            </svg>
          </button>
        )}
        <span className="convo-header-name">{otherName}</span>
        <div className="convo-header-meta">
          <a
            href={`https://socionicsinsight.com/types/${match.other.type.toLowerCase()}/`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
          >
            {match.other.type}
          </a>
          {relInfo && (
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>· {relInfo.name}</span>
          )}
          {/* ··· menu — mobile */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem', padding: '0.25rem 0.25rem 0.25rem 0.5rem', lineHeight: 1 }}
              aria-label="Options"
            >
              ···
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 4, minWidth: 160, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                {isCoolingOff && iBlockedThem ? (
                  <button type="button" onClick={handleLiftBlock} style={menuItemStyle}>Lift cool-off</button>
                ) : !activeBlock ? (
                  <>
                    <button type="button" onClick={() => { setModal('cooloff'); setMenuOpen(false) }} style={menuItemStyle}>Cool off (7 days)</button>
                    <button type="button" onClick={() => { setModal('block'); setMenuOpen(false) }} style={{ ...menuItemStyle, color: '#c0392b' }}>Block & report</button>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden-mobile" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', fontWeight: 500 }}>{otherName}</h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginTop: '0.15rem' }}>
              <a href={`https://socionicsinsight.com/types/${match.other.type.toLowerCase()}/`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                {match.other.type}
              </a>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            {relInfo && (
              <div style={{ textAlign: 'right', maxWidth: 200 }}>
                <p style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500 }}>{relInfo.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5, marginTop: '0.15rem' }}>{relInfo.description}</p>
                {relInfo.siSlug && (
                  <a href={`https://socionicsinsight.com/relations/${relInfo.siSlug}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.68rem', color: 'var(--accent)', opacity: 0.7, textDecoration: 'none' }}>
                    Learn more →
                  </a>
                )}
              </div>
            )}
            {/* ··· menu */}
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem', padding: '0.25rem', lineHeight: 1 }}
                aria-label="Options"
              >
                ···
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 4, minWidth: 160, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  {isCoolingOff && iBlockedThem ? (
                    <button type="button" onClick={handleLiftBlock} style={menuItemStyle}>
                      Lift cool-off
                    </button>
                  ) : !activeBlock ? (
                    <>
                      <button type="button" onClick={() => { setModal('cooloff'); setMenuOpen(false) }} style={menuItemStyle}>
                        Cool off (7 days)
                      </button>
                      <button type="button" onClick={() => { setModal('block'); setMenuOpen(false) }} style={{ ...menuItemStyle, color: '#c0392b' }}>
                        Block & report
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cooling off banner */}
      {isCoolingOff && (
        <div style={{ padding: '0.6rem 1.5rem', background: 'rgba(154,111,56,0.07)', borderBottom: '1px solid var(--accent-lt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>
            {iBlockedThem
              ? `Messaging paused until ${coolingOffUntil}. `
              : `${otherName} has paused messaging until ${coolingOffUntil}.`}
          </p>
          {iBlockedThem && (
            <button type="button" onClick={handleLiftBlock} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--accent)', textDecoration: 'underline' }}>
              Lift early
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg)' }}>
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Start the conversation.</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>You and {otherName} are {relInfo?.name?.toLowerCase() ?? 'connected'}.</p>
          </div>
        ) : (() => {
          const now = new Date()
          const todayStr = now.toDateString()
          const yesterdayStr = new Date(now - 86400000).toDateString()
          let lastDateStr = null
          const items = []

          for (const msg of messages) {
            const msgDate = new Date(msg.created_at)
            const msgDateStr = msgDate.toDateString()

            if (msgDateStr !== lastDateStr) {
              lastDateStr = msgDateStr
              const label = msgDateStr === todayStr
                ? 'Today'
                : msgDateStr === yesterdayStr
                  ? 'Yesterday'
                  : msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: msgDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })

              items.push(
                <div key={`divider-${msg.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
              )
            }

            const isMine = msg.sender_id === currentUserId
            const timeStr = new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            const quotedMsg = msg.reply_to
            const showReplyBtn = hoveredMsgId === msg.id && !activeBlock

            function startLongPress(msg) {
              longPressTimer.current = setTimeout(() => {
                setReplyTo({ id: msg.id, content: msg.content, sender_id: msg.sender_id })
                setHoveredMsgId(null)
              }, 500)
            }
            function cancelLongPress() {
              clearTimeout(longPressTimer.current)
            }

            items.push(
              <div
                key={msg.id}
                style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                onMouseEnter={() => !activeBlock && setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                  <div
                    onClick={() => !activeBlock && setReplyTo({ id: msg.id, content: msg.content, sender_id: msg.sender_id })}
                    onTouchStart={() => startLongPress(msg)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    style={{
                      background: isMine ? 'var(--accent)' : '#fff',
                      color: isMine ? '#fff' : 'var(--text)',
                      border: `1px solid ${isMine ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '0.65rem 0.9rem',
                      fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 300,
                      cursor: activeBlock ? 'default' : 'pointer',
                    }}
                  >
                    {quotedMsg && (
                      <div style={{
                        borderLeft: `2px solid ${isMine ? 'rgba(255,255,255,0.5)' : 'var(--accent-lt)'}`,
                        paddingLeft: '0.5rem',
                        marginBottom: '0.5rem',
                        opacity: 0.8,
                      }}>
                        <p style={{ fontSize: '0.75rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginBottom: '0.1rem', fontWeight: 500 }}>
                          {quotedMsg.sender_id === currentUserId ? 'You' : otherName}
                        </p>
                        <p style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {quotedMsg.content}
                        </p>
                      </div>
                    )}
                    {msg.content}
                  </div>
                  {/* Reply icon — visible on hover (desktop) */}
                  <button
                    type="button"
                    onClick={() => setReplyTo({ id: msg.id, content: msg.content, sender_id: msg.sender_id })}
                    aria-label="Reply"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--muted)', padding: '0.25rem', lineHeight: 1,
                      opacity: showReplyBtn ? 1 : 0,
                      transition: 'opacity 0.15s',
                      flexShrink: 0,
                      pointerEvents: showReplyBtn ? 'auto' : 'none',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4,3 1,6 4,9"/>
                      <path d="M1 6h7a5 5 0 0 1 5 5v1"/>
                    </svg>
                  </button>
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--muted)', alignSelf: isMine ? 'flex-end' : 'flex-start', paddingInline: '0.2rem' }}>{timeStr}</span>
              </div>
            )
          }
          return items
        })()}
        <div ref={bottomRef} />
      </div>

      {!hasFeedback && messages.length >= 5 && (
        <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(154,111,56,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>How is this connection going?</p>
          <button type="button" onClick={() => navigate(`/feedback/${match.id}`)} style={{ background: 'none', border: '1px solid var(--accent-lt)', borderRadius: 3, padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Rate it →
          </button>
        </div>
      )}

      {/* Input — disabled during cool off or block */}
      <div style={{ borderTop: '1px solid var(--border)', background: '#fff' }}>
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ flex: 1, borderLeft: '2px solid var(--accent)', paddingLeft: '0.5rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.1rem' }}>
                {replyTo.sender_id === currentUserId ? 'You' : otherName}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                {replyTo.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', lineHeight: 1, flexShrink: 0 }}
              aria-label="Cancel reply"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
              </svg>
            </button>
          </div>
        )}
        <div style={{ padding: '1rem 1.5rem' }}>
        {activeBlock ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', padding: '0.5rem 0' }}>
            Messaging is paused for this conversation.
          </p>
        ) : (
          <div className="field-group">
            <input
              type="text"
              ref={inputRef}
              placeholder={`Message ${otherName}…`}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            />
            <button className="btn-primary" onClick={handleSend} disabled={!text.trim() || sending} style={{ borderRadius: 0, opacity: (!text.trim() || sending) ? 0.5 : 1 }}>
              Send
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Cool off modal */}
      {modal === 'cooloff' && (
        <div onClick={() => setModal(null)} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={modalStyle}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', marginBottom: '0.75rem' }}>Cool off?</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              This will hide you and {otherName} from each other's feed and pause messaging for 7 days. The conversation stays visible. After 7 days everything returns to normal automatically.
            </p>
            {blockError && <p style={{ fontSize: '0.82rem', color: '#c0392b', marginBottom: '0.75rem' }}>{blockError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleCoolOff} disabled={blocking} style={{ opacity: blocking ? 0.6 : 1 }}>
                {blocking ? 'Pausing…' : 'Cool off for 7 days'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block & report modal */}
      {modal === 'block' && (
        <div onClick={() => setModal(null)} style={overlayStyle}>
          <div onClick={e => e.stopPropagation()} style={modalStyle}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', marginBottom: '0.75rem' }}>Block & report</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              This is permanent and cannot be undone from the app. {otherName} will be removed from your feed and this conversation will be hidden.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <select className="input-standalone" value={blockReason} onChange={e => setBlockReason(e.target.value)} style={{ fontFamily: 'var(--sans)' }}>
                <option value="spam">Spam or fake profile</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="other">Other</option>
              </select>
              <textarea
                className="input-standalone"
                placeholder="Additional details (optional)"
                value={blockNotes}
                onChange={e => setBlockNotes(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6 }}
              />
            </div>
            {blockError && <p style={{ fontSize: '0.82rem', color: '#c0392b', marginBottom: '0.75rem' }}>{blockError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button
                type="button"
                onClick={handleHardBlock}
                disabled={blocking}
                style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '0.9rem 1.5rem', fontSize: '0.82rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2, opacity: blocking ? 0.6 : 1 }}
              >
                {blocking ? 'Blocking…' : 'Block permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const menuItemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text)',
}

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 200,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '2rem',
}

const modalStyle = {
  background: '#fff', borderRadius: 6, padding: '2rem',
  width: '100%', maxWidth: 440,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
}
