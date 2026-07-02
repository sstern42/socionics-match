import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import TypeSelector from '../components/onboarding/TypeSelector'
import { useAuth } from '../lib/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { requestTurn, requestAnalysis, requestConfirm, setSelfReportedType, downloadTranscript } from '../lib/onboardingChat'
import { isOnboardingChatCouponEligible } from '../lib/premium'

const TOTAL_TOPICS = 12
const VERIFIED_TYPE_SOURCES = new Set(['paid_verified', 'community_verified'])
const ONBOARDING_COUPON_CODE = import.meta.env.VITE_ONBOARDING_COUPON_CODE
// Optional YYYY-MM-DD matching the Stripe promotion code's own "Redeem by"
// date — keeps the banner from advertising a code Stripe will already be
// rejecting at checkout. Undefined/unparseable means "no cutoff" (banner
// only gated on ONBOARDING_COUPON_CODE being set at all).
const ONBOARDING_COUPON_EXPIRES = import.meta.env.VITE_ONBOARDING_COUPON_EXPIRES
  ? new Date(`${import.meta.env.VITE_ONBOARDING_COUPON_EXPIRES}T23:59:59`)
  : null

const TYPE_NAMES = {
  ILE: 'Intuitive Logical Extravert', LII: 'Logical Intuitive Introvert',
  LIE: 'Logical Intuitive Extravert', ILI: 'Intuitive Logical Introvert',
  EIE: 'Ethical Intuitive Extravert', IEI: 'Intuitive Ethical Introvert',
  IEE: 'Intuitive Ethical Extravert', EII: 'Ethical Intuitive Introvert',
  LSE: 'Logical Sensory Extravert',  SLE: 'Sensory Logical Extravert',
  SLI: 'Sensory Logical Introvert',  LSI: 'Logical Sensory Introvert',
  ESE: 'Ethical Sensory Extravert',  SEE: 'Sensory Ethical Extravert',
  SEI: 'Sensory Ethical Introvert',  ESI: 'Ethical Sensory Introvert',
}

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'var(--accent)' : 'var(--surface)',
        color: isUser ? '#fff' : 'var(--text)',
        fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--muted)', display: 'inline-block',
          animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }`}</style>
    </div>
  )
}

function ErrorNotice({ message, onSkip }) {
  if (!message) return null
  return (
    <div style={{ textAlign: 'center', fontSize: 13, color: '#e87070', padding: '8px 0' }}>
      {message}
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          style={{ display: 'block', margin: '6px auto 0', background: 'none', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', padding: '4px 12px', borderRadius: 14 }}
        >
          Pick your type instead
        </button>
      )}
    </div>
  )
}

export default function TypingChat() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') === 'signup' ? 'signup' : 'retake'

  usePageMeta(
    'Free Typing Chat | Socion™',
    'A short, adaptive chat to get a preliminary read on your Socionics type — free, and always visibly preliminary until a paid report confirms it.'
  )

  const [screen, setScreen] = useState('intro') // intro | chat | analysing | lean-choice | results | self-select
  const [history, setHistory] = useState([])
  const [topicIndex, setTopicIndex] = useState(0)
  const [followupsUsed, setFollowupsUsed] = useState(0)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [finalType, setFinalType] = useState(null)
  const [finalConfidence, setFinalConfidence] = useState(null)
  const [wasApplied, setWasApplied] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, screen])

  // Keep focus on the input after each round-trip (initial question or a
  // reply), on both the chat screen and the mount that follows start().
  useEffect(() => {
    if (screen === 'chat' && !sending) inputRef.current?.focus()
  }, [screen, sending])

  if (loading || !session) return null

  async function start() {
    setError(null)
    setSending(true)
    window.umami?.track('typing-chat-started', { source })
    try {
      const res = await requestTurn({ conversationHistory: [], topicIndex: 0, followupsUsedOnTopic: 0 })
      setHistory([{ role: 'assistant', content: res.assistant_message }])
      setTopicIndex(res.topic_index)
      setFollowupsUsed(res.followups_used_on_topic)
      setScreen('chat')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setError(null)
    const newHistory = [...history, { role: 'user', content: text }]
    setHistory(newHistory)
    setSending(true)
    try {
      const res = await requestTurn({ conversationHistory: newHistory, topicIndex, followupsUsedOnTopic: followupsUsed })
      const updated = [...newHistory, { role: 'assistant', content: res.assistant_message }]
      setHistory(updated)
      setTopicIndex(res.topic_index)
      setFollowupsUsed(res.followups_used_on_topic)
      if (res.is_complete) {
        analyse(updated)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function analyse(transcript) {
    setScreen('analysing')
    setError(null)
    try {
      const res = await requestAnalysis({ transcript })
      if (res.fallback) {
        setError(res.message)
        setScreen('self-select')
        return
      }
      setAnalysis(res)
      if (res.requires_lean_choice) {
        setScreen('lean-choice')
      } else {
        await confirmType(res.primary_type, res.primary_confidence)
      }
    } catch (err) {
      setError(err.message)
      setScreen('analysis-error')
    }
  }

  async function confirmType(type, confidence) {
    setError(null)
    try {
      const { applied } = await requestConfirm({ type, confidence })
      setFinalType(type)
      setFinalConfidence(confidence)
      setWasApplied(applied)
      window.umami?.track('typing-chat-completed', { type, source, applied })
      await refreshProfile()
      setScreen('results')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSelfSelect(type) {
    setError(null)
    try {
      await setSelfReportedType(type)
      window.umami?.track('type-confirmed', { type, method: 'manual', context: 'typing-chat-skip' })
      await refreshProfile()
      setFinalType(type)
      setFinalConfidence(null)
      setWasApplied(true)
      setAnalysis(null)
      setScreen('results')
    } catch (err) {
      setError(err.message)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleDone() {
    navigate(source === 'signup' ? '/profile/setup' : '/profile/edit')
  }

  const couponWithinWindow = !ONBOARDING_COUPON_EXPIRES || new Date() <= ONBOARDING_COUPON_EXPIRES
  const couponEligible = isOnboardingChatCouponEligible(profile) && !!ONBOARDING_COUPON_CODE && couponWithinWindow
  const alreadyVerified = !!profile && VERIFIED_TYPE_SOURCES.has(profile.type_source)
  const couponDaysLeft = ONBOARDING_COUPON_EXPIRES
    ? Math.max(1, Math.ceil((ONBOARDING_COUPON_EXPIRES - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem 4rem', minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>

        {screen === 'intro' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem', textAlign: 'center', margin: 'auto 0' }}>
            <div>
              <p className="eyebrow">Free · ~5 minutes</p>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
                {source === 'signup' ? <>Let's find your <em>type</em></> : <>Try the <em>typing chat</em></>}
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: 1.65, maxWidth: 460 }}>
                A short, adaptive conversation — no jargon, no forced-choice questions. You'll get a preliminary type read at the end, clearly marked as such until a{' '}
                <a href="/typing" style={{ color: 'var(--accent)', textDecoration: 'none' }}>paid, human-reviewed report</a>{' '}
                confirms it.
              </p>
              {alreadyVerified && (
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.6, maxWidth: 440, fontStyle: 'italic' }}>
                  Your type ({profile.type}) is already confirmed, so this won't change your profile — feel free to try it out of curiosity.
                </p>
              )}
            </div>
            <button type="button" className="btn-primary" onClick={start} disabled={sending}>
              {sending ? 'Starting…' : 'Start the chat'}
            </button>
            <button
              type="button"
              onClick={() => setScreen('self-select')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              I'd rather just pick my type
            </button>
            <ErrorNotice message={error} />
          </div>
        )}

        {screen === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', flexShrink: 0 }}>
              <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Topic {Math.min(topicIndex + 1, TOTAL_TOPICS)} of {TOTAL_TOPICS}
              </p>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: '0.4rem' }}>
                <div style={{
                  height: '100%',
                  width: `${(Math.min(topicIndex, TOTAL_TOPICS) / TOTAL_TOPICS) * 100}%`,
                  background: 'var(--accent)', borderRadius: 2, transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
              {history.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
              {sending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px' }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <ErrorNotice message={error} onSkip={() => setScreen('self-select')} />
              <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your answer…"
                rows={1}
                disabled={sending}
                style={{
                  flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '10px 14px', color: 'var(--text)',
                  fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5,
                  maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
                }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              />
              <button onClick={send} disabled={!input.trim() || sending} style={{
                width: 38, height: 38, borderRadius: '50%',
                background: input.trim() && !sending ? 'var(--accent)' : 'var(--surface)',
                border: '1px solid var(--border)',
                color: input.trim() && !sending ? '#fff' : 'var(--muted)',
                cursor: input.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }} aria-label="Send">↑</button>
            </div>
            <button
              type="button"
              onClick={() => setScreen('self-select')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', margin: '0.6rem auto 0' }}
            >
              I'd rather just pick my type
            </button>
          </div>
        )}

        {screen === 'analysing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', margin: 'auto 0', textAlign: 'center' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px' }}>
              <TypingIndicator />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Working through what you've shared…</p>
          </div>
        )}

        {screen === 'analysis-error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', margin: 'auto 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{error ?? "We couldn't finish analysing that conversation."}</p>
            <button type="button" className="btn-primary" onClick={() => analyse(history)}>Try again</button>
            <button
              type="button"
              onClick={() => setScreen('self-select')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Pick your type instead
            </button>
          </div>
        )}

        {screen === 'lean-choice' && analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem', textAlign: 'center', margin: 'auto 0' }}>
            <div>
              <p className="eyebrow">Genuine uncertainty</p>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.5rem,4vw,2.25rem)', marginTop: '0.5rem' }}>
                It's close between two types
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.6rem', maxWidth: 440 }}>
                {analysis.summary}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[{ type: analysis.primary_type, confidence: analysis.primary_confidence }, ...(analysis.alternatives?.slice(0, 1) ?? [])].map(c => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => confirmType(c.type, c.confidence)}
                  style={{
                    padding: '1.25rem 1.75rem', border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--card-bg)', cursor: 'pointer', minWidth: 160,
                  }}
                >
                  <div style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', color: 'var(--accent)' }}>{c.type}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{TYPE_NAMES[c.type]}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.5rem', letterSpacing: '0.04em' }}>{Math.round(c.confidence * 100)}% confidence</div>
                </button>
              ))}
            </div>
            <ErrorNotice message={error} />
            <button
              type="button"
              onClick={() => setScreen('self-select')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Neither feels right — let me pick my type
            </button>
          </div>
        )}

        {screen === 'self-select' && (
          <div style={{ margin: 'auto 0', width: '100%' }}>
            <ErrorNotice message={error} />
            <TypeSelector onConfirm={handleSelfSelect} />
          </div>
        )}

        {screen === 'results' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', textAlign: 'center', margin: 'auto 0', width: '100%' }}>
            <div>
              <p className="eyebrow">{wasApplied ? 'Preliminary result' : 'Just for fun'}</p>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,6vw,3.5rem)', marginTop: '0.5rem' }}>
                <em>{finalType}</em>
              </h1>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                {TYPE_NAMES[finalType]}
              </p>
              {finalConfidence != null && (
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.4rem', letterSpacing: '0.04em' }}>
                  {Math.round(finalConfidence * 100)}% confidence
                </p>
              )}
            </div>

            {analysis?.summary && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.7, maxWidth: 480 }}>
                {analysis.summary}
              </p>
            )}

            {analysis?.key_signals?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: 480 }}>
                {analysis.key_signals.map((s, i) => (
                  <span key={i} style={{ fontSize: '0.76rem', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 20, padding: '0.3rem 0.8rem' }}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, maxWidth: 440 }}>
              {wasApplied
                ? 'This is a preliminary read, not a full report — it stays visibly preliminary until a paid typist confirms it.'
                : `Your confirmed type (${profile?.type}) hasn't changed — this was just a test run, and a chat read can never overwrite a type that's already been confirmed.`}
            </p>

            {couponEligible && (
              <div style={{ padding: '1rem 1.25rem', border: '1px solid var(--accent-lt)', borderRadius: 8, background: 'rgba(154,111,56,0.06)', maxWidth: 440 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>
                  Thanks for completing the chat — use code <strong style={{ color: 'var(--accent)' }}>{ONBOARDING_COUPON_CODE}</strong> for 25% off your first year of Premium
                  {couponDaysLeft ? ` (expires in ${couponDaysLeft} day${couponDaysLeft === 1 ? '' : 's'}).` : '.'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 360 }}>
              <button type="button" className="btn-primary" onClick={handleDone}>Continue</button>
              {wasApplied && (
                <a
                  href="/typing"
                  style={{ fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none' }}
                  onClick={() => window.umami?.track('verify-type-clicked', { from: 'typing-chat-results' })}
                >
                  Verify your type with a specialist →
                </a>
              )}
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadTranscript(history)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Download your answers
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </Layout>
  )
}
