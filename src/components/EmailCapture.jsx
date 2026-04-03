// EmailCapture.jsx — drop into src/components/
// Add VITE_MAILERLITE_API_KEY to Netlify env vars

import { useState } from 'react'

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_MAILERLITE_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          groups: ['183746899844532206'],
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      window.umami?.track('homepage-email-captured')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section style={{
      borderTop: '1px solid var(--border)',
      padding: '4rem 2rem',
      textAlign: 'center',
      background: '#fff',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Follow the experiment</p>
        <p style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(1.1rem,2.5vw,1.4rem)',
          color: 'var(--text)',
          lineHeight: 1.6,
          marginBottom: '0.75rem',
        }}>
          Not ready to join yet?
        </p>
        <p style={{
          fontSize: '0.92rem',
          color: 'var(--muted)',
          lineHeight: 1.7,
          marginBottom: '2rem',
        }}>
          Get occasional data updates as the intertype relations matrix gets tested at scale.
        </p>

        {status === 'success' ? (
          <p style={{
            fontSize: '0.92rem',
            color: 'var(--accent)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
          }}>
            You're in. We'll be in touch as the data builds.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: '0.5rem',
              maxWidth: 400,
              margin: '0 auto',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                flex: '1 1 200px',
                padding: '0.65rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 3,
                fontSize: '0.92rem',
                fontFamily: 'inherit',
                color: 'var(--text)',
                background: 'var(--bg)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="btn-primary"
              style={{
                flex: '0 0 auto',
                fontSize: '0.88rem',
                padding: '0.65rem 1.5rem',
                opacity: status === 'loading' ? 0.6 : 1,
              }}
            >
              {status === 'loading' ? 'Subscribing...' : 'Follow'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
            Something went wrong. Try again or come back later.
          </p>
        )}
      </div>
    </section>
  )
}
