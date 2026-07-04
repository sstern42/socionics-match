import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { getSignupDevice } from '../lib/device'

const IS_PROD = window.location.hostname === 'socion.app'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const PENDING_EMAIL_KEY = 'socion_pending_email'

// OAuth providers (besides Google, which uses Google Identity Services below)
// are only offered in production: their redirect URLs have to be allow-listed
// in the Supabase dashboard, which the ephemeral Deploy Preview origins aren't.
// On a preview the email magic code is the one flow that works, so it's shown
// expanded there instead of collapsed behind a link.
const OAUTH_ENABLED = IS_PROD

export default function Auth() {
  usePageMeta('Sign In or Create a Free Account | Socion™', 'Sign in or create a free Socion account. Match by Socionics personality type — choose your dynamic and connect with people who fit you by design.')
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [, setOtpMode] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [linkError, setLinkError] = useState(null)
  // The email magic code is de-emphasised: on prod it starts collapsed behind a
  // link (OAuth is the primary path); on a Deploy Preview, where OAuth isn't
  // available, it's expanded from the start.
  const [showEmail, setShowEmail] = useState(!OAUTH_ENABLED)
  const { session, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const incomingType = searchParams.get('type')
  const googleButtonRef = useRef(null)

  useEffect(() => {
    if (authLoading) return
    if (session) navigate(profile ? '/' : '/onboarding')
  }, [session, profile, authLoading])

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error=access_denied') || hash.includes('error_code=otp_expired')) {
      setLinkError('otp_expired')
      setShowEmail(true)
      window.history.replaceState(null, '', window.location.pathname)
      const savedEmail = localStorage.getItem(PENDING_EMAIL_KEY)
      if (savedEmail) setEmail(savedEmail)
    }
  }, [])

  useEffect(() => {
    if (!IS_PROD || !GOOGLE_CLIENT_ID) return

    let cancelled = false
    let interval

    // Google Identity Services renders its own button and its styling can't be
    // freely overridden (brand rules), but it does ship a dark theme. Pick the
    // theme from the site's own light/dark state (html.dark) so the button
    // isn't a stark white box on the dark UI, and re-render if the theme is
    // toggled while the page is open. logo_alignment:'center' groups the logo
    // and label so it matches the Discord button beside it.
    function renderGoogleButton() {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return
      const isDark = document.documentElement.classList.contains('dark')
      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        width: googleButtonRef.current.offsetWidth || 400,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
      })
    }

    function initGoogle() {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      })
      renderGoogleButton()
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          initGoogle()
        }
      }, 100)
    }

    const themeObserver = new MutationObserver(renderGoogleButton)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      themeObserver.disconnect()
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

  async function handleOAuth(provider) {
    setError(null)
    setLoading(true)
    try {
      // Redirects away to the provider, then back to the current origin; on
      // success onAuthStateChange (AuthContext) picks up the session. Unlike the
      // magic-link call there's no place to pass signup_device, so provider
      // signups just omit the device segment in the Discord notification —
      // consistent with how Google already behaves.
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
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
        // signup_device tags the eventual auth.users row (via
        // raw_user_meta_data) so the Discord #signups notification can show
        // what kind of device a new member joined from. Only applied when the
        // user is created; ignored for existing users signing back in.
        options: { shouldCreateUser: true, data: { signup_device: getSignupDevice() } },
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="6-digit code"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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

  const hasOAuth = OAUTH_ENABLED

  return (
    <Layout>
      <section style={centreStyle}>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">{incomingType ? `Working type · ${incomingType}` : 'Sign in or create account'}</p>
            <h1 className="fade-up-2" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
              {incomingType ? <>Sign in to find your <em>matches</em></> : <>Welcome to <em>Socion</em></>}
            </h1>
          </div>

          {hasOAuth && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {GOOGLE_CLIENT_ID && (
                <div ref={googleButtonRef} className="google-btn-slot" style={{ width: '100%', minHeight: 44 }} />
              )}
              <button
                type="button"
                onClick={() => handleOAuth('discord')}
                disabled={loading}
                style={{ ...oauthButtonStyle, opacity: loading ? 0.6 : 1 }}
              >
                <DiscordIcon />
                Continue with Discord
              </button>
              {error && !showEmail && (
                <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>
              )}
            </div>
          )}

          {showEmail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {hasOAuth && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>or with email</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
              )}
              <input
                className="input-standalone"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
                autoFocus={!hasOAuth}
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
          ) : (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: '0.82rem', color: 'var(--muted)', textDecoration: 'underline',
                textUnderlineOffset: '3px', alignSelf: 'center',
              }}
            >
              Sign in with email instead
            </button>
          )}

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

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '4rem 1.5rem', gap: '2rem',
}

const oauthButtonStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
  width: '100%', minHeight: 44, padding: '0 1rem',
  border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--surface)', color: 'var(--text)',
  fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
}
