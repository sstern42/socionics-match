import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { session, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading) return
    if (session) navigate('/feed')
  }, [session, authLoading])

  async function handleSubmit() {
    if (!email.trim()) return
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: 'https://socion.app/feed',
        },
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p className="eyebrow fade-up-1">Check your inbox</p>
          <h1 className="fade-up-2" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)' }}>
            Magic link <em>sent</em>
          </h1>
          <p className="fade-up-3" style={{ color: 'var(--muted)', maxWidth: 420, textAlign: 'center' }}>
            We sent a sign-in link to <strong>{email}</strong>. Click it to access your account — no password needed.
          </p>
          <button className="btn-ghost fade-up-4" onClick={() => { setSent(false); setEmail('') }}>
            Use a different email
          </button>
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <section style={centreStyle}>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Sign in or create account</p>
            <h1 className="fade-up-2" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
              Welcome to <em>Socion</em>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.75rem' }}>
              Enter your email and we'll send you a sign-in link.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="input-standalone"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            {error && (
              <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !email.trim()}
              style={{ opacity: (loading || !email.trim()) ? 0.6 : 1, marginTop: '0.5rem' }}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            New users will be prompted to set up a profile after clicking the link. By continuing you agree to our{' '}
            <a href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none' }}>privacy policy</a>.
          </p>
        </div>
      </section>
    </Layout>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '4rem 1.5rem', gap: '2rem',
}
