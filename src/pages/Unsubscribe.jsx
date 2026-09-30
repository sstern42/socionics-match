import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { usePageMeta } from '../hooks/usePageMeta'
import { supabaseUrl } from '../lib/supabase'

// Confirmation page for the unsubscribe link in Socion's non-transactional
// emails (supabase/functions/_shared/email.ts). Opening it never unsubscribes
// anyone -- mail scanners prefetch links -- so the change only happens when
// the button POSTs to the email-unsubscribe edge function, which checks the
// link's signature. Works signed out.

function decodeEmail(param) {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), c => c.charCodeAt(0))
    const email = new TextDecoder().decode(bytes)
    return email.includes('@') ? email : null
  } catch {
    return null
  }
}

export default function Unsubscribe() {
  usePageMeta('Unsubscribe | Socion™', 'Stop receiving Socion update emails.')
  const [params] = useSearchParams()
  const e = params.get('e') ?? ''
  const t = params.get('t') ?? ''
  const email = e && t ? decodeEmail(e) : null

  const [status, setStatus] = useState('idle') // idle | busy | done | error
  const [error, setError] = useState(null)

  async function confirm() {
    setStatus('busy')
    setError(null)
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/email-unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`,
        { method: 'POST' },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Something went wrong. Please try again.')
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  return (
    <Layout noScroll hideFooter>
      <section style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
          <p className="eyebrow">Email preferences</p>

          {!email ? (
            <>
              <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)' }}>This link doesn't look right</h1>
              <p style={textStyle}>
                It may have been cut short by your email app. Try opening it again from the email, or if you have an account, change your email preferences in{' '}
                <Link to="/profile/notifications" style={linkStyle}>Settings</Link>.
              </p>
            </>
          ) : status === 'done' ? (
            <>
              <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)' }}>You're unsubscribed</h1>
              <p style={textStyle}>
                <strong>{email}</strong> won't get Socion updates or reminder emails any more. If you have an account, you'll still get essential emails about it, such as billing.
              </p>
              <p style={textStyle}>
                Changed your mind? You can turn updates back on in{' '}
                <Link to="/profile/notifications" style={linkStyle}>Settings</Link>.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)' }}>Unsubscribe from Socion emails?</h1>
              <p style={textStyle}>
                Stop sending Socion updates and reminder emails to <strong>{email}</strong>.
              </p>
              {error && <p style={{ fontSize: '0.82rem', color: '#c0392b' }}>{error}</p>}
              <button
                type="button"
                className="btn-primary"
                onClick={confirm}
                disabled={status === 'busy'}
                style={{ alignSelf: 'center', opacity: status === 'busy' ? 0.6 : 1 }}
              >
                {status === 'busy' ? 'Unsubscribing…' : 'Unsubscribe'}
              </button>
            </>
          )}
        </div>
      </section>
    </Layout>
  )
}

const textStyle = { fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.7 }
const linkStyle = { color: 'var(--accent)', textDecoration: 'none' }
