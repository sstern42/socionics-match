import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'
import { supabase, supabaseUrl, supabaseKey } from '../lib/supabase'

// Truthful at launch — only features that actually gate. Message history is
// fully retained for everyone (lapsed principle: nothing is ever deleted), so
// it is NOT a premium limitation and is not listed as one.
const FEATURES = [
  ['Connections', 'No cap on active connections', '3 active'],
  ['Relation filters', 'Filter your feed by any of the 16 relation types', 'Same quadra only'],
  ['Compatibility breakdown', 'Full Model A breakdown — function interactions, strengths, friction points', '—'],
  ['Read receipts', 'Know when your sent messages have been read', '—'],
  ['AI assistant', 'Unlimited Socionics AI — ask anything about your type and relations', '10 messages / day'],
  ['Your strongest matches', 'See the relation types that fit you most naturally, and filter to them', '—'],
  ['Who viewed you', 'Full viewer list — name, type, relation, and when they visited', '7-day count only'],
  ['Dynamics', 'Per-relation ratings, message volumes, and site average comparison', '—'],
  ['Profile badge', 'Founding member ✦ or Premium subscriber ★ badge on your profile', '—'],
]


export default function Premium() {
  usePageMeta('Socion™ Premium — Unlimited Matching, $14.99/yr', 'Unlimited connections, all 16 relation filters, read receipts, viewer history, compatibility breakdowns, and Socionics AI — $14.99/year.')
  const { session, profile, isPremium, loading } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const isFounding = profile?.is_founding_member === true
  const isSubscriber = !isFounding && (profile?.plan_status === 'active' || profile?.plan_status === 'past_due')
  const referralTrialUntil = profile?.referral_premium_until ? new Date(profile.referral_premium_until) : null
  const onReferralTrial = !isFounding && !isSubscriber && referralTrialUntil && referralTrialUntil > new Date()
  const trialDaysLeft = onReferralTrial ? Math.max(1, Math.ceil((referralTrialUntil - new Date()) / 86400000)) : 0

  async function callFunction(name) {
    const { data: { session: s } } = await supabase.auth.getSession()
    const token = s?.access_token
    if (!token) throw new Error('Please sign in again.')
    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey, 'Content-Type': 'application/json' },
    })
    const text = await res.text()
    let json = {}
    try { json = JSON.parse(text) } catch { /* non-JSON */ }
    if (!res.ok && !json.should_use_portal) throw new Error(json.error ?? `Something went wrong (${res.status}).`)
    return json
  }

  async function handleUpgrade() {
    if (!session) { navigate('/auth'); return }
    setBusy(true)
    setError(null)
    window.umami?.track('premium-upgrade-clicked')
    try {
      const json = await callFunction('create-checkout-session')
      if (json.url) { window.location.href = json.url; return }
      if (json.should_use_portal) { return handleManage() }
      throw new Error(json.error ?? 'Could not start checkout.')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function handleManage() {
    setBusy(true)
    setError(null)
    window.umami?.track('premium-manage-clicked')
    try {
      const json = await callFunction('create-portal-session')
      if (json.url) { window.location.href = json.url; return }
      throw new Error(json.error ?? 'Could not open the customer portal.')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          {isFounding || isSubscriber ? <>You're on <em>Premium</em></> : <>Socion <em>Premium</em></>}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Socion's core is free and always will be. Premium unlocks the full experience for those who want it.
        </p>

        {/* Founding member callout */}
        {isFounding && (
          <div style={{ background: 'var(--accent)', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '2.5rem', color: '#fff' }}>
            <p style={{ fontWeight: 600, fontSize: '0.88rem', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              You're a founding member. ✦
            </p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, opacity: 0.9 }}>
              You joined during Socion's launch, so Premium is yours — full access, free, permanently. No subscription, nothing to manage.
            </p>
          </div>
        )}

        {/* Referral trial callout */}
        {onReferralTrial && (
          <div style={{ background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--accent)', marginBottom: '0.35rem' }}>
              You're on a Premium trial — {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              You got this from a referral. Subscribe below to keep Premium once it ends.
            </p>
          </div>
        )}

        {/* Active subscriber callout */}
        {isSubscriber && (
          <div style={{ background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--accent)', marginBottom: '0.35rem' }}>
              {profile?.plan_status === 'past_due' ? 'Your payment needs attention' : 'Your Premium is active'}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
              {profile?.plan_status === 'past_due'
                ? 'We had trouble taking your last payment. Update your card to keep Premium — your access stays on in the meantime.'
                : 'Manage your subscription, update your payment method, or view invoices in the customer portal.'}
            </p>
            <button type="button" className="btn-primary" onClick={handleManage} disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Opening…' : 'Manage subscription'}
            </button>
          </div>
        )}

        {/* Feature comparison */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Feature</span>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center' }}>Premium</span>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>Free</span>
          </div>
          {FEATURES.map(([label, premium, free], i) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.85rem 1rem', borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text)', textAlign: 'center', lineHeight: 1.4 }}>{premium}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>{free}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          Your full message history and every connection you've made stay with you on either tier — nothing is ever deleted or locked away.
        </p>

        {/* Price + CTA — for anyone without a real subscription (free tier or referral trial) */}
        {!isFounding && !isSubscriber && (
          <div style={{ border: '1px solid var(--accent-lt)', borderRadius: 8, padding: '1.75rem', textAlign: 'center', marginBottom: '2rem', background: 'rgba(154,111,56,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', color: 'var(--text)' }}>$14.99 / year</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--muted)', textDecoration: 'line-through', opacity: 0.6 }}>$29.99</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.35rem' }}>
              Billed annually. Cancel anytime.
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginBottom: '1.5rem', fontWeight: 500 }}>
              Launch offer — price will rise as the product grows.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleUpgrade}
              disabled={busy || loading}
              style={{ width: '100%', maxWidth: 280, opacity: (busy || loading) ? 0.6 : 1 }}
            >
              {busy ? 'Starting checkout…' : session ? 'Upgrade to Premium' : 'Sign in to upgrade'}
            </button>
            {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', marginTop: '1rem' }}>{error}</p>}
          </div>
        )}

        {(isFounding || isSubscriber) && error && (
          <p style={{ fontSize: '0.82rem', color: '#c0392b', marginBottom: '1.5rem' }}>{error}</p>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Questions?{' '}
            <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Ask in the Discord</a>
            {' · '}
            <Link to="/help" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Help & FAQ</Link>
          </p>
        </div>
      </section>
    </Layout>
  )
}
