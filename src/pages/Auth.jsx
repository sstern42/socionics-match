import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const IS_PROD = window.location.hostname === 'socion.app'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const PENDING_EMAIL_KEY = 'socion_pending_email'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [otpMode, setOtpMode] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [linkError, setLinkError] = useState(null)
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const googleButtonRef = useRef(null)

  useEffect(() => {
    if (authLoading) return
    if (session) navigate('/feed')
  }, [session, authLoading])

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error=access_denied') || hash.includes('error_code=otp_expired')) {
      setLinkError('otp_expired')
      window.history.replaceState(null, '', window.location.pathname)
      const savedEmail = localStorage.getItem(PENDING_EMAIL_KEY)
      if (savedEmail) setEmail(savedEmail)
    }
  }, [])

  useEffect(() => {
    if (!IS_PROD || !GOOGLE_CLIENT_ID) return

    function initGoogle() {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      })
      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleButtonRef.current.offsetWidth || 400,
          text: 'continue_with',
          shape: 'rectangular',
        })
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          initGoogle()
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [authLoading])

  async function handleGoogleCredential(response) {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) return
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      })
      if (error) throw error
      localStorage.setItem(PENDING_EMAIL_KEY, email.trim())
      setSent(true)
      setOtpMode(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim() || otpCode.length < 6) return
    setError(null)
    setVerifying(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      })
      if (error) throw error
      localStorage.removeItem(PENDING_EMAIL_KEY)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  if (sent) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p className="eyebrow fade-up-1">Check your inbox</p>
          <h1 className="fade-up-2" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)' }}>
            Enter your <em>code</em>
          </h1>
          <p className="fade-up-3" style={{ color: 'var(--muted)', maxWidth: 420, textAlign: 'center' }}>
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to sign in.
          </p>
          <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="input-standalone"
              type="number"
              placeholder="6-digit code"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
              autoFocus
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.2em' }}
            />
            {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}
            <button
              type="button"
              className="btn-primary"
              onClick={handleVerifyOtp}
              disabled={verifying || otpCode.length < 6}
              style={{ opacity: (verifying || otpCode.length < 6) ? 0.6 : 1 }}
            >
              {verifying ? 'Verifying…' : 'Sign in'}
            </button>
          </div>
          <button className="btn-ghost fade-up-4" onClick={() => { setSent(false); setOtpCode(''); setEmail('') }}>
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
          </div>

          <>
            {IS_PROD && GOOGLE_CLIENT_ID && (
              <>
                <div ref={googleButtonRef} style={{ width: '100%', minHeight: 44 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>or</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                className="input-standalone"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
                autoFocus
              />
              {linkError === 'otp_expired' && (
                <div style={{ background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)', borderRadius: 6, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--accent)', lineHeight: 1.6, margin: 0 }}>
                    That sign-in link has expired.{email ? ` Send a new code to ` : ' Enter your email to get a new code.'}<strong>{email || ''}</strong>{email ? '?' : ''}
                  </p>
                  {email && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => { setLinkError(null); handleMagicLink() }}
                      disabled={loading}
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', opacity: loading ? 0.6 : 1 }}
                    >
                      {loading ? 'Sending…' : 'Send new code →'}
                    </button>
                  )}
                </div>
              )}
              {error && (
                <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>
              )}
              <button
                type="button"
                className="btn-ghost"
                onClick={handleMagicLink}
                disabled={loading || !email.trim()}
                style={{ opacity: (loading || !email.trim()) ? 0.6 : 1 }}
              >
                {loading ? 'Please wait…' : 'Send code'}
              </button>
            </div>
          </>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            New users will be prompted to set up a profile after signing in. By continuing you agree to our{' '}
            <a href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none' }}>privacy policy</a>
            {' '}and{' '}
            <a href="/terms" style={{ color: 'var(--accent)', textDecoration: 'none' }}>terms of service</a>.
          </p>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)' }}>
            Not ready to join yet?{' '}
            <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Join the Discord →
            </a>
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
