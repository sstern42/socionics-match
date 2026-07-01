import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { supabase, supabaseUrl, supabaseKey } from '../lib/supabase'
import { updateProfileData } from '../lib/profile'
import ReferralPanel from '../components/profile/ReferralPanel'

// Lightweight settings page. Exists primarily as the return target for the
// Stripe customer portal (create-portal-session return_url = /settings) and as
// a home for subscription management. Refreshes the profile on mount so a
// just-returned-from-portal user sees their current plan.
export default function Settings() {
  usePageTitle('Settings')
  const { session, profile, isPremium, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [use24Hour, setUse24Hour] = useState(false)
  const [savingClock, setSavingClock] = useState(false)

  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (session) refreshProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    setUse24Hour(profile?.profile_data?.use_24hour_clock ?? false)
  }, [profile])

  async function handleToggleClock(checked) {
    setUse24Hour(checked)
    if (!profile) return
    setSavingClock(true)
    try {
      await updateProfileData(profile.id, {
        profileData: { ...profile.profile_data, use_24hour_clock: checked },
      })
      await refreshProfile()
    } catch (err) {
      setError(err.message)
      setUse24Hour(!checked)
    } finally {
      setSavingClock(false)
    }
  }

  const isFounding = profile?.is_founding_member === true
  const isPastDue = profile?.plan_status === 'past_due'
  const isSubscriber = !isFounding && (profile?.plan_status === 'active' || isPastDue)
  const referralTrialUntil = profile?.referral_premium_until ? new Date(profile.referral_premium_until) : null
  const onReferralTrial = !isFounding && !isSubscriber && referralTrialUntil && referralTrialUntil > new Date()
  const trialDaysLeft = onReferralTrial ? Math.max(1, Math.ceil((referralTrialUntil - new Date()) / 86400000)) : 0

  const planLabel = isFounding
    ? 'Founding member'
    : profile?.plan_status === 'active'
      ? 'Premium'
      : profile?.plan_status === 'past_due'
        ? 'Premium (payment due)'
        : onReferralTrial
          ? `Premium trial — ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} left`
          : 'Free'

  async function handleManage() {
    setBusy(true)
    setError(null)
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const token = s?.access_token
      if (!token) throw new Error('Please sign in again.')
      const res = await fetch(`${supabaseUrl}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey, 'Content-Type': 'application/json' },
      })
      const text = await res.text()
      let json = {}
      try { json = JSON.parse(text) } catch { /* non-JSON */ }
      if (!res.ok) throw new Error(json.error ?? `Something went wrong (${res.status}).`)
      if (json.url) { window.location.href = json.url; return }
      throw new Error('Could not open the customer portal.')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (loading || !session) return (
    <Layout noScroll hideFooter>
      <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    </Layout>
  )

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '2rem' }}>
          Settings
        </h1>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>Plan</p>
              <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)' }}>{planLabel}</p>
            </div>
            {isFounding && (
              <span style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: 'var(--accent)', padding: '0.25rem 0.6rem', borderRadius: 3, flexShrink: 0 }}>✦ Free forever</span>
            )}
          </div>

          {isFounding && (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              You have permanent free Premium as a founding member. There's no subscription to manage.
            </p>
          )}

          {isSubscriber && (
            <>
              {isPastDue && (
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)', lineHeight: 1.6 }}>
                  We had trouble taking your last payment. Update your payment method to keep Premium.
                </p>
              )}
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                {isPastDue
                  ? 'Your access stays on in the meantime — manage your subscription or update your card below.'
                  : 'Manage your subscription, update your payment method, or view invoices.'}
              </p>
              <button type="button" className="btn-primary" onClick={handleManage} disabled={busy} style={{ alignSelf: 'flex-start', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Opening…' : isPastDue ? 'Update payment method' : 'Manage subscription'}
              </button>
            </>
          )}

          {onReferralTrial && (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                You're on a Premium trial from a referral — unlimited connections and full compatibility breakdowns until it ends. Subscribe to keep Premium afterwards.
              </p>
              <Link to="/premium" className="btn-primary" style={{ alignSelf: 'flex-start', textDecoration: 'none' }}>
                Upgrade to Premium
              </Link>
            </>
          )}

          {!isPremium && (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                You're on the free tier — 3 connections and same-quadra matches.
              </p>
              <Link to="/premium" className="btn-primary" style={{ alignSelf: 'flex-start', textDecoration: 'none' }}>
                Upgrade to Premium
              </Link>
            </>
          )}

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b' }}>{error}</p>}
        </div>

        <ReferralPanel profile={profile} isPremium={isPremium} />

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', marginTop: '1.5rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>Display</p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={use24Hour}
              disabled={savingClock}
              onChange={e => handleToggleClock(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>🕒 Use 24-hour clock</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                Show times like 14:30 instead of 2:30 PM wherever an exact time is shown (Messages, Rooms, Admin). Relative timestamps like "2h ago" are unaffected.
              </p>
            </div>
          </label>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '2rem', lineHeight: 1.7 }}>
          Looking for profile and notification settings? They're under{' '}
          <Link to="/profile/edit" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Profile</Link>.
        </p>
      </section>
    </Layout>
  )
}
