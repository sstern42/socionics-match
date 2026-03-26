import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RELATIONS } from '../../data/relations'
import { getMessages, sendMessage, subscribeToMessages } from '../../lib/messages'

export default function Conversation({ match, currentUserId, hasFeedback }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const relInfo = RELATIONS[match.relation_type]
  const otherName = match.other.profile_data?.name ?? match.other.type

  useEffect(() => {
    setMessages([])
    setLoading(true)

    let cancelled = false

    getMessages(match.id).then(msgs => {
      if (!cancelled) {
        setMessages(msgs)
        setLoading(false)
      }
    })

    const channel = subscribeToMessages(match.id, newMsg => {
      if (!cancelled) {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      }
    })

    return () => {
      cancelled = true
      channel.unsubscribe()
    }
  }, [match.id])

  useEffect(() => {
    const wasInputFocused = document.activeElement === inputRef.current
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    if (wasInputFocused) {
      inputRef.current?.focus()
    }
  }, [messages])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const msg = await sendMessage({ matchId: match.id, senderId: currentUserId, content: text.trim() })
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
      setText('')
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Conversation header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', fontWeight: 500 }}>{otherName}</h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, marginTop: '0.15rem' }}>
              {match.other.type}
            </p>
          </div>
          {relInfo && (
            <div style={{ textAlign: 'right', maxWidth: 200 }}>
              <p style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500 }}>
                {relInfo.name}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5, marginTop: '0.15rem' }}>
                {relInfo.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg)' }}>
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Start the conversation.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              You and {otherName} are {relInfo?.name?.toLowerCase() ?? 'connected'}.
            </p>
          </div>
        ) : messages.map(msg => {
          const isMine = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: '70%',
                background: isMine ? 'var(--accent)' : '#fff',
                color: isMine ? '#fff' : 'var(--text)',
                border: `1px solid ${isMine ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '0.65rem 0.9rem',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              {msg.content}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!hasFeedback && messages.length >= 5 && (
        <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(154,111,56,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>How is this connection going?</p>
          <button
            type="button"
            onClick={() => navigate(`/feedback/${match.id}`)}
            style={{ background: 'none', border: '1px solid var(--accent-lt)', borderRadius: 3, padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Rate it →
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: '#fff' }}>
        <div className="field-group">
          <input
            type="text"
            ref={inputRef}
            placeholder={`Message ${otherName}…`}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{ borderRadius: 0, opacity: (!text.trim() || sending) ? 0.5 : 1 }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
