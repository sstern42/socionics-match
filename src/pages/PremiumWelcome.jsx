import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'

// Stripe redirects here after a successful checkout. The webhook
// (checkout.session.completed) is what actually flips plan_status to 'active',
// and it can land a beat after this page loads — so we refresh the profile a
// few times rather than assuming Premium is live immediately.
export default function PremiumWelcome() {
  const { isPremium, refreshProfile } = useAuth()
  const [checking, setChecking] = useState(true)
  const attempts = useRef(0)

  useEffect(() => {
    window.umami?.track('premium-welcome-viewed')
    let cancelled = false

    async function poll() {
      const p = await refreshProfile()
      const premiumNow = p?.is_founding_member === true
        || p?.plan_status === 'active'
        || p?.plan_status === 'past_due'
      if (cancelled) return
      if (premiumNow || attempts.current >= 4) {
        setChecking(false)
        return
      }
      attempts.current += 1
      setTimeout(poll, 1500)
    }
    poll()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Layout noScroll hideFooter>
      <section style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 1.5rem', gap: '1.5rem' }}>
        {checking && !isPremium ? (
          <>
            <p className="eyebrow">Almost there</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)' }}>Activating your <em>Premium</em>…</h1>
            <p style={{ color: 'var(--muted)', maxWidth: 420, lineHeight: 1.7 }}>
              Payment received. We're switching everything on now — this only takes a moment.
            </p>
          </>
        ) : isPremium ? (
          <>
            <p className="eyebrow">Welcome to Premium ✦</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)' }}>You're <em>all set</em></h1>
            <div style={{ maxWidth: 440, width: '100%', textAlign: 'left', background: 'rgba(154,111,56,0.06)', border: '1px solid var(--accent-lt)', borderRadius: 8, padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.75rem' }}>Now unlocked</p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>Unlimited connections — no cap</li>
                <li style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>All 16 relation types in your feed</li>
                <li style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>Full Model A compatibility breakdown</li>
                <li style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>Read receipts on messages you send</li>
                <li style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>Unlimited Socionics AI assistant</li>
                <li style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>Your strongest matches and who viewed you</li>
                <li style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>Relation dynamics — ratings and message volumes</li>
              </ul>
            </div>
            <Link to="/feed" className="btn-primary" style={{ textDecoration: 'none' }}>Continue to Socion →</Link>
          </>
        ) : (
          <>
            <p className="eyebrow">Thanks for upgrading</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)' }}>Premium is on its <em>way</em></h1>
            <p style={{ color: 'var(--muted)', maxWidth: 440, lineHeight: 1.7 }}>
              Your payment went through. It's taking a moment to activate on your account — it'll appear shortly. If it hasn't switched on in a few minutes, reopen this page or check back from the feed.
            </p>
            <Link to="/feed" className="btn-ghost" style={{ textDecoration: 'none' }}>Go to the feed</Link>
          </>
        )}
      </section>
    </Layout>
  )
}
