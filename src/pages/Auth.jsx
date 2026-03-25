import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { signIn } from '../lib/auth'
import { useAuth } from '../lib/AuthContext'

const IS_PROD = window.location.hostname === 'socion.app'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading) return
    if (session) navigate('/feed')
  }, [session, authLoading])

  async function handleMagicLink() {
    if (!email.trim()) return
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/feed` },
      })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePassword() {
    if (!email.trim() || !password) return
    setError(null)
    setLoading(true)
    try {
      await signIn(email.trim(), password)
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
              {IS_PROD ? "Enter your email and we'll send you a sign-in link." : "Preview environment — use email and password."}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="input-standalone"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (IS_PROD ? handleMagicLink() : handlePassword())}
              autoFocus
            />
            {!IS_PROD && (
              <input
                className="input-standalone"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePassword()}
              />
            )}
            {error && (
              <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={IS_PROD ? handleMagicLink : handlePassword}
              disabled={loading || !email.trim() || (!IS_PROD && !password)}
              style={{ opacity: (loading || !email.trim() || (!IS_PROD && !password)) ? 0.6 : 1, marginTop: '0.5rem' }}
            >
              {loading ? 'Please wait…' : IS_PROD ? 'Send magic link' : 'Sign in'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            New users will be prompted to set up a profile after signing in. By continuing you agree to our{" "}
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
