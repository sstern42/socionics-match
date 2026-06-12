import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat-socionics`

const SUGGESTED_QUESTIONS = [
  'What is my Dual relation and why does it matter?',
  'How is Socionics different from MBTI?',
  'What does Model A actually tell us?',
  'Which relation types work best for romantic relationships?',
]

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--muted)',
          display: 'inline-block',
          animation: 'bounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'var(--accent)' : 'var(--surface)',
        color: isUser ? '#fff' : 'var(--text)',
        fontSize: 14,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {content}
      </div>
    </div>
  )
}

export default function SocionicsChat({ userType = null }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userMessage = text ?? input.trim()
    if (!userMessage || loading) return
    setInput('')
    setError(null)
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ messages: newMessages, userType }),
      })
      if (!res.ok) throw new Error('Something went wrong. Please try again.')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([...newMessages, { role: 'assistant', content: data.content }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 480,
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--card-bg)', flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#fff', flexShrink: 0,
        }}>✦</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            Socionics Assistant
          </div>
          {userType && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Personalised for {userType}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 8px',
        background: 'var(--bg)',
      }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--accent)' }}>✦</div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Ask anything about Socionics — types, relations, compatibility, Model A.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, margin: '0 auto' }}>
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 10, padding: '10px 14px',
                    color: 'var(--text)', fontSize: 13,
                    cursor: 'pointer', textAlign: 'left', lineHeight: 1.5,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.background = 'rgba(154,111,56,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--card-bg)'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '18px 18px 18px 4px',
            }}>
              <TypingIndicator />
            </div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#e87070', padding: '8px 0' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: 'var(--card-bg)', flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Socionics…"
          rows={1}
          style={{
            flex: 1,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 14px',
            color: 'var(--text)', fontSize: 14,
            resize: 'none', outline: 'none', lineHeight: 1.5,
            maxHeight: 120, overflowY: 'auto',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            color: input.trim() && !loading ? '#fff' : 'var(--muted)',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
          aria-label="Send"
        >↑</button>
      </div>
    </div>
  )
}
