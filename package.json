import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { signIn, signUp } from '../lib/auth'
import { getProfile } from '../lib/profile'
import { useAuth } from '../lib/AuthContext'

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  // If already signed in and profile exists, go to feed
  useEffect(() => {
    if (session && profile) navigate('/feed')
    else if (session && profile === null) navigate('/profile/setup')
  }, [session, profile])

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setConfirmSent(true)
      } else {
        const data = await signIn(email, password)
        // Check if profile exists to determine where to send them
        const existingProfile = await getProfile(data.user.id)
        if (existingProfile) {
          navigate('/feed')
        } else {
          navigate('/profile/setup')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (confirmSent) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p className="eyebrow fade-up-1">Check your inbox</p>
          <h1 className="fade-up-2" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)' }}>
            Confirm your <em>email</em>
          </h1>
          <p className="fade-up-3" style={{ color: 'var(--muted)', maxWidth: 420, textAlign: 'center' }}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account, then sign in here.
          </p>
          <button className="btn-ghost fade-up-4" onClick={() => { setConfirmSent(false); setMode('signin') }}>
            Back to sign in
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
            <p className="eyebrow">{mode === 'signup' ? 'Create account' : 'Welcome back'}</p>
            <h1 className="fade-up-2" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
              {mode === 'signup' ? <><em>Join</em> Socion</> : <>Sign <em>in</em></>}
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="input-standalone"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <input
              className="input-standalone"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && (
              <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              style={{ opacity: loading ? 0.6 : 1, marginTop: '0.5rem' }}
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--muted)' }}>
            {mode === 'signup' ? 'Already have an account? ' : 'No account yet? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline' }}
            >
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
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
