import { useState, useRef, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { getRelation, getTypeForRelation, RELATIONS } from '../data/relations'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat-socionics`

const GENERIC_QUESTIONS = [
  'What is my Dual relation and why does it matter?',
  'How is Socionics different from MBTI?',
  'What does Model A actually tell us?',
  'Which relation types work best for romantic relationships?',
  'How do Reinin dichotomies go beyond the four basic Jungian dimensions?',
]

function buildDefaultChips(userType) {
  if (!userType) return GENERIC_QUESTIONS
  const dualType = getTypeForRelation(userType, 'DUAL')
  const activityType = getTypeForRelation(userType, 'ACTIVITY')
  const mirrorType = getTypeForRelation(userType, 'MIRROR')
  return [
    `What's the ${userType}–${dualType} Dual dynamic like in practice?`,
    `How do ${userType}s and ${activityType}s relate in close relationships?`,
    `What are the ${userType}'s blind spots in relationships?`,
    `Which relation types work best for ${userType} in a team?`,
    `How do ${userType} and ${mirrorType} differ despite seeming similar?`,
  ]
}

// ── Inline markdown renderer ──────────────────────────────────────────────────
function renderInline(text) {
  const parts = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\((https?:\/\/[^\)]+)\))/g
  let last = 0, match, key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[2])      parts.push(<strong key={key++}>{match[2]}</strong>)
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>)
    else if (match[4]) parts.push(<code key={key++} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:3, padding:'0.1em 0.35em', fontSize:'0.88em', fontFamily:'monospace' }}>{match[4]}</code>)
    else if (match[5]) parts.push(<a key={key++} href={match[6]} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', textDecoration:'underline' }}>{match[5]}</a>)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function parseTableRow(line) {
  return line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
}

function isTableRow(line) { return /^\|.+\|$/.test(line.trim()) }
function isSeparatorRow(line) { return /^\|[\s\-:|]+\|$/.test(line.trim()) }

function MarkdownContent({ content }) {
  const lines = content.split('\n')
  const elements = []
  let i = 0, key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const sizes = { 1: '1.1rem', 2: '1rem', 3: '0.95rem' }
      elements.push(
        <p key={key++} style={{ fontSize: sizes[level], fontWeight: 600, color: 'var(--text)', margin: '0.75rem 0 0.35rem', lineHeight: 1.4 }}>
          {renderInline(headingMatch[2])}
        </p>
      )
      i++; continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />)
      i++; continue
    }

    // Table — collect header + separator + body rows
    if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = parseTableRow(line)
      i += 2 // skip header + separator
      const rows = []
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      const cellStyle = {
        padding: '0.45rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        fontSize: 13,
        color: 'var(--text)',
        lineHeight: 1.5,
        textAlign: 'left',
      }
      const headCellStyle = {
        ...cellStyle,
        fontWeight: 600,
        background: 'var(--surface)',
        color: 'var(--muted)',
        fontSize: 12,
        letterSpacing: '0.04em',
      }
      elements.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '0.5rem 0 0.75rem', borderRadius: 6, border: '1px solid var(--border)', borderRight: 'none', borderBottom: 'none' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                {headers.map((h, ci) => (
                  <th key={ci} style={{ ...headCellStyle, borderLeft: ci === 0 ? 'none' : undefined }}>
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(154,111,56,0.03)' : 'transparent' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ ...cellStyle, borderLeft: ci === 0 ? 'none' : undefined }}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Bullet list
    if (/^[\-\*\+]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[\-\*\+]\s/.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: '0.25rem', lineHeight: 1.6 }}>{renderInline(lines[i].replace(/^[\-\*\+]\s/, ''))}</li>)
        i++
      }
      elements.push(<ul key={key++} style={{ margin: '0.35rem 0 0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column' }}>{items}</ul>)
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: '0.25rem', lineHeight: 1.6 }}>{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</li>)
        i++
      }
      elements.push(<ol key={key++} style={{ margin: '0.35rem 0 0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column' }}>{items}</ol>)
      continue
    }

    // Blockquote
    if (/^>\s/.test(line)) {
      elements.push(
        <blockquote key={key++} style={{ borderLeft: '3px solid var(--accent-lt)', paddingLeft: '0.75rem', margin: '0.4rem 0', color: 'var(--muted)', fontStyle: 'italic' }}>
          {renderInline(line.replace(/^>\s/, ''))}
        </blockquote>
      )
      i++; continue
    }

    // Paragraph
    const paraLines = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3}\s|[\-\*\+]\s|\d+\.\s|>\s|[-*_]{3,}$)/.test(lines[i]) &&
      !(isTableRow(lines[i]) && i + 1 < lines.length && isSeparatorRow(lines[i + 1]))
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length) {
      elements.push(
        <p key={key++} style={{ margin: '0 0 0.5rem', lineHeight: 1.65 }}>
          {paraLines.map((l, idx) => (
            <span key={idx}>{renderInline(l)}{idx < paraLines.length - 1 && <br />}</span>
          ))}
        </p>
      )
    }
  }

  return <div style={{ fontSize: 14, color: 'var(--text)' }}>{elements}</div>
}

// ── Chat components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--muted)', display: 'inline-block',
          animation: 'bounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }`}</style>
    </div>
  )
}

function Message({ role, content, streaming }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{
        maxWidth: isUser ? '78%' : '88%',
        padding: '10px 14px',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'var(--accent)' : 'var(--surface)',
        color: isUser ? '#fff' : 'var(--text)',
        fontSize: 14, lineHeight: 1.6,
      }}>
        {isUser
          ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</span>
          : <>
              <MarkdownContent content={content} />
              {streaming && (
                <span style={{
                  display: 'inline-block', width: 2, height: '1em',
                  background: 'var(--accent)', marginLeft: 2,
                  animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom',
                }} />
              )}
              <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
            </>
        }
      </div>
    </div>
  )
}

// ── Upgrade prompt ────────────────────────────────────────────────────────────

function UpgradePrompt() {
  return (
    <div style={{
      margin: '8px 0',
      padding: '14px 16px',
      borderRadius: 12,
      border: '1px solid var(--accent-lt)',
      background: 'rgba(154,111,56,0.06)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>✦</div>
      <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.55 }}>
        You've used your 10 free AI messages for today.<br />
        Upgrade to Premium for unlimited access.
      </p>
      <a
        href="/premium"
        style={{
          display: 'inline-block',
          padding: '8px 20px',
          borderRadius: 20,
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Upgrade to Premium
      </a>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 10

export default function SocionicsChat({ userType = null, userId = null, isPremium = false, initialQuestion = null }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [messageCount, setMessageCount] = useState(null)
  const [connectionRelations, setConnectionRelations] = useState([])
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [authUserId, setAuthUserId] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const initialFired = useRef(false)
  const restoredRef = useRef(false)

  // Restore persisted conversation once we know who's asking (skip if an initial question is queued)
  useEffect(() => {
    if (!authUserId || restoredRef.current) return
    restoredRef.current = true
    if (initialQuestion) return
    try {
      const saved = JSON.parse(localStorage.getItem(`chat_history_${authUserId}`) ?? 'null')
      if (Array.isArray(saved) && saved.length) setMessages(saved)
    } catch {}
  }, [authUserId])

  // Persist conversation as it evolves
  useEffect(() => {
    if (!authUserId) return
    if (messages.length) {
      localStorage.setItem(`chat_history_${authUserId}`, JSON.stringify(messages))
    } else {
      localStorage.removeItem(`chat_history_${authUserId}`)
    }
  }, [messages, authUserId])

  useEffect(() => {
    if (!userId || !userType) return
    async function fetchConnections() {
      const { data, error } = await supabase
        .from('matches')
        .select('user_a_id, user_b_id, user_a:user_a_id(type), user_b:user_b_id(type)')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
        .is('unmatched_at', null)
        .limit(3)

      if (error || !data?.length) return

      const relations = data
        .map(m => {
          const otherType = m.user_a_id === userId ? m.user_b?.type : m.user_a?.type
          const rel = otherType ? getRelation(otherType, userType) : null
          return rel ? RELATIONS[rel]?.name : null
        })
        .filter(Boolean)

      setConnectionRelations(relations)
    }
    fetchConnections()
  }, [userId, userType])

  const chips = useMemo(() => {
    const defaultChips = buildDefaultChips(userType)
    if (!connectionRelations.length) return defaultChips
    const connectionChips = [...new Set(connectionRelations)].slice(0, 2).map(rel =>
      `What friction or strengths should I expect in a ${rel} relation?`
    )
    return [...connectionChips, ...defaultChips].slice(0, 5)
  }, [userType, connectionRelations])

  useEffect(() => {
    async function fetchCount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setAuthUserId(user.id)
      const today = new Date().toISOString().slice(0, 10)
      const storageKey = `msg_count_${user.id}_${today}`
      const cached = parseInt(localStorage.getItem(storageKey) ?? '0', 10)
      // For free users, prefer the server count (source of truth for enforcement)
      if (!isPremium) {
        const { data } = await supabase
          .from('ai_message_counts')
          .select('count')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()
        const serverCount = data?.count ?? 0
        const count = Math.max(cached, serverCount)
        localStorage.setItem(storageKey, String(count))
        setMessageCount(count)
      } else {
        setMessageCount(cached)
      }
      if (initialQuestion && !initialFired.current) {
        initialFired.current = true
        send(initialQuestion)
      }
    }
    fetchCount()
  }, [isPremium])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { return () => abortRef.current?.abort() }, [])


  function copyMessage(content, i) {
    navigator.clipboard?.writeText(content)
    setCopiedIndex(i)
    setTimeout(() => setCopiedIndex(prev => (prev === i ? null : prev)), 1500)
  }

  function retry() {
    const last = messages[messages.length - 1]
    if (last?.role === 'user') send(last.content, { isRetry: true })
  }

  async function send(text, { isRetry = false } = {}) {
    const userMessage = text ?? input.trim()
    if (!userMessage || streaming) return
    setInput('')
    setError(null)
    setShowUpgrade(false)
    const newMessages = isRetry ? messages : [...messages, { role: 'user', content: userMessage }]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setStreaming(true)
    abortRef.current = new AbortController()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch(FUNCTION_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ messages: newMessages, userType, connectionRelations }),
        signal: abortRef.current.signal,
      })
      if (res.ok) {
        setMessageCount(prev => {
          const next = (prev ?? 0) + 1
          const today = new Date().toISOString().slice(0, 10)
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) localStorage.setItem(`msg_count_${user.id}_${today}`, String(next))
          })
          return next
        })
      }
      if (!res.ok) {
        // Remove the optimistic assistant message
        setMessages(prev => prev.slice(0, -1))
        let errorMsg = 'Something went wrong. Please try again.'
        try {
          const data = await res.json()
          errorMsg = data.error ?? errorMsg
          if (data.upgrade) { setShowUpgrade(true); return }
        } catch {}
        throw new Error(errorMsg)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })

        // Check for max_tokens sentinel from edge function
        if (accumulated.endsWith('__MAX_TOKENS__')) {
          accumulated = accumulated.slice(0, -'__MAX_TOKENS__'.length).trimEnd()
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: accumulated }
            return updated
          })
          setError('Response was cut off — ask me to continue or try a more specific question.')
          return
        }

        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
          return updated
        })
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }

      // If we got nothing back at all, something went wrong silently
      if (!accumulated.trim()) {
        setMessages(prev => prev.slice(0, -1))
        setError('No response received. Please try again.')
        return
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        return last?.role === 'assistant' && last?.content === '' ? prev.slice(0, -1) : prev
      })
    } finally {
      setStreaming(false)
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
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--card-bg)', flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#fff', flexShrink: 0,
        }}>✦</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Socionics Assistant</div>
          {userType && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Personalised for {userType}</div>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {messageCount !== null && (
            <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {isPremium
                ? `${messageCount} today · unlimited`
                : `${messageCount} / ${FREE_DAILY_LIMIT} today`}
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null); setShowUpgrade(false) }}
              style={{
                background: 'none', border: 'none',
                color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                padding: '4px 8px', borderRadius: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', background: 'var(--bg)' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--accent)' }}>✦</div>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Ask anything about Socionics — types, relations, compatibility, Model A.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, margin: '0 auto' }}>
              {chips.map(q => (
                <button key={q} onClick={() => send(q)} style={{
                  background: 'var(--card-bg)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text)',
                  fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.5,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='rgba(154,111,56,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--card-bg)' }}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isLastStreaming = streaming && i === messages.length - 1 && m.role === 'assistant'
          return (
            <div key={i}>
              <Message role={m.role} content={m.content} streaming={isLastStreaming} />
              {m.role === 'assistant' && m.content && !isLastStreaming && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: -6, marginBottom: 12 }}>
                  <button
                    onClick={() => copyMessage(m.content, i)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
                      padding: '2px 6px', borderRadius: 6,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                  >
                    {copiedIndex === i ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {streaming && messages[messages.length - 1]?.content === '' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px' }}>
              <TypingIndicator />
            </div>
          </div>
        )}

        {showUpgrade && <UpgradePrompt />}
        {error && !showUpgrade && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#e87070', padding: '8px 0' }}>
            {error}
            {messages[messages.length - 1]?.role === 'user' && (
              <button
                onClick={retry}
                style={{
                  display: 'block', margin: '6px auto 0',
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 12, cursor: 'pointer',
                  padding: '4px 12px', borderRadius: 14,
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 14px 8px', borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 8,
        background: 'var(--card-bg)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Socionics…"
          rows={1}
          style={{
            flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 14px', color: 'var(--text)',
            fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5,
            maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
        />
        <button onClick={() => send()} disabled={!input.trim() || streaming} style={{
          width: 38, height: 38, borderRadius: '50%',
          background: input.trim() && !streaming ? 'var(--accent)' : 'var(--surface)',
          border: '1px solid var(--border)',
          color: input.trim() && !streaming ? '#fff' : 'var(--muted)',
          cursor: input.trim() && !streaming ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0, transition: 'background 0.15s, color 0.15s',
        }} aria-label="Send">↑</button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
          AI can make mistakes. Verify anything important at{' '}
          <a href="https://socionicsinsight.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>socionicsinsight.com</a>.
        </p>
      </div>
    </div>
  )
}
