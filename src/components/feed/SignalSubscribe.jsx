import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { subscribeToSignal, SIGNAL_CONSENT_TEXT } from '../../lib/signal'

/**
 * One-click Socionics Signal sign-up using the member's account email.
 * Renders nothing once the member is subscribed (profile.signal_opt_in),
 * apart from a short confirmation straight after subscribing.
 *
 * `source` is a SIGNAL_SOURCES value; `compact` is the sidebar layout.
 * Umami: signal-subscribe-click, signal-subscribed, signal-subscribe-error.
 */
export default function SignalSubscribe({ source, compact = false, lead }) {
  const { session, profile, refreshProfile } = useAuth()
  const [state, setState] = useState('idle') // idle | busy | done | error
  const [error, setError] = useState(null)

  const email = session?.user?.email
  if (!profile || !email) return null
  if (profile.signal_opt_in === true && state !== 'done') return null

  async function handleSubscribe() {
    setState('busy')
    setError(null)
    window.umami?.track('signal-subscribe-click', { source })
    try {
      await subscribeToSignal(source)
      window.umami?.track('signal-subscribed', { source })
      setState('done')
      refreshProfile?.()
    } catch (e) {
      window.umami?.track('signal-subscribe-error', { source })
      setError(e.message)
      setState('error')
    }
  }

  const wrap = compact
    ? { marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }
    : { paddingTop: '0.85rem', borderTop: '1px solid rgba(154,111,56,0.25)' }

  if (state === 'done') {
    return (
      <div style={wrap}>
        <p style={{ fontSize: '0.8rem', color: 'var(--accent)', margin: 0, lineHeight: 1.5 }}>
          You're subscribed to Socionics Signal. The next edition will arrive at {email}.
        </p>
      </div>
    )
  }

  return (
    <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ fontSize: compact ? '0.78rem' : '0.82rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>
        {lead ?? <>Get new articles and Socion news in your inbox with <strong>Socionics Signal</strong>.</>}
      </p>
      <button
        type="button"
        className="btn-ghost"
        onClick={handleSubscribe}
        disabled={state === 'busy'}
        style={{ fontSize: '0.78rem', padding: '0.45rem 1rem', alignSelf: compact ? 'stretch' : 'flex-start' }}
      >
        {state === 'busy' ? 'Subscribing…' : 'Subscribe with one click'}
      </button>
      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: 0, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
        Sends to {email}. {SIGNAL_CONSENT_TEXT}
      </p>
      {error && (
        <p role="alert" style={{ fontSize: '0.74rem', color: '#a33', margin: 0 }}>{error}</p>
      )}
    </div>
  )
}
