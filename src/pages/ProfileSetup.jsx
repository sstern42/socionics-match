import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import RelationPicker from '../components/profile/RelationPicker'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { createProfile, updateRelationPreferences, isDuplicateNameError, DUPLICATE_NAME_MESSAGE } from '../lib/profile'
import { attributeAndRewardReferral, getStoredReferralCode, getStoredReferrerName } from '../lib/referral'
import { COUNTRIES } from '../data/countries'
import { TYPES } from '../data/relations'

export default function ProfileSetup() {
  usePageTitle('Profile Setup')
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const referredByCode = getStoredReferralCode()
  const referrerName = getStoredReferrerName()

  const savedType = sessionStorage.getItem('socion_type') || localStorage.getItem('socion_type') || ''
  const savedConfidence = JSON.parse(sessionStorage.getItem('socion_confidence') || localStorage.getItem('socion_confidence') || 'null')
  const savedPurpose = JSON.parse(sessionStorage.getItem('socion_purpose') || localStorage.getItem('socion_purpose') || '["dating"]')
  // Set when the user picked "I don't know yet" during onboarding (a
  // placeholder guess via TypeSelector, not a real read) — routes them into
  // the real typing chat right after account creation so it can promote/
  // overwrite the guess via apply_onboarding_type(). See issue #866.
  const wantsChat = sessionStorage.getItem('socion_wants_chat') === '1' || localStorage.getItem('socion_wants_chat') === '1'

  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [hideActivity, setHideActivity] = useState(false)
  const [type, setType] = useState(savedType)
  // Inline equivalent of the socion_wants_chat flag for anyone who reaches
  // this page without savedType (see the fallback dropdown below) -- lets
  // them opt into the post-signup typing chat without restarting onboarding.
  const [chatOptIn, setChatOptIn] = useState(false)
  const [relations, setRelations] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Guard: if the user already has a profile (e.g. navigated back here, or
  // refreshed mid-onboarding), send them straight to the feed. Gated on
  // justSavedRef so this doesn't also fire off the back of handleSave()'s
  // own refreshProfile() call below -- that would race handleSave()'s
  // explicit navigate(destination) and could win (trackSignup() isn't
  // awaited, so loading flipping back to false via the finally block is not
  // a safe enough signal), always landing on /feed regardless of
  // wantsChat/chatOptIn.
  const justSavedRef = useRef(false)
  useEffect(() => {
    if (profile && !justSavedRef.current) navigate('/feed', { replace: true })
  }, [profile])

  async function handleSave() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const newProfile = await createProfile({
        authId: session.user.id,
        type,
        typeConfidence: savedConfidence ?? { [type]: 1.0 },
        profileData: { name, dob: dob || null, gender, bio, country, city: city.trim(), anonymous, hide_activity: hideActivity },
        purpose: savedPurpose,
      })

      if (!newProfile) {
        throw new Error('Profile was not created — check Supabase RLS policies.')
      }

      // Type + purpose (the qualifying action) are already set above, so
      // attribution and reward fire together right here rather than from a
      // separate "onboarding complete" event.
      await attributeAndRewardReferral(newProfile.id)

      if (relations.length > 0) {
        await updateRelationPreferences(newProfile.id, relations)
      }

      sessionStorage.removeItem('socion_type')
      sessionStorage.removeItem('socion_confidence')
      sessionStorage.removeItem('socion_purpose')
      sessionStorage.removeItem('socion_wants_chat')
      localStorage.removeItem('socion_type')
      localStorage.removeItem('socion_confidence')
      localStorage.removeItem('socion_purpose')
      localStorage.removeItem('socion_wants_chat')

      justSavedRef.current = true
      await refreshProfile()

      // "I don't know yet" at onboarding (wantsChat) or the equivalent
      // inline opt-in on this page's fallback dropdown (chatOptIn) both mean
      // `type` above is only a placeholder guess (issue #866) — send them
      // straight into the real typing chat so it can promote/overwrite it
      // via apply_onboarding_type(). Otherwise land on the feed as usual.
      const destination = (wantsChat || chatOptIn) ? '/typing/chat?source=signup' : '/feed'

      // Track signup — retry until Umami is ready (defer loading means it may not be available immediately)
      const trackSignup = (attempts = 0) => {
        if (window.umami) {
          window.umami.track('signup-completed', { type, purpose: savedPurpose?.join(',') ?? '' })
          navigate(destination)
        } else if (attempts < 10) {
          setTimeout(() => trackSignup(attempts + 1), 500)
        } else {
          // Umami never loaded — navigate anyway
          navigate(destination)
        }
      }
      trackSignup()
    } catch (err) {
      setError(isDuplicateNameError(err) ? DUPLICATE_NAME_MESSAGE : err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'details') {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}>
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {referredByCode && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', background: 'rgba(154,111,56,0.05)', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
                🎉 {referrerName ? <>You were invited by <strong>{referrerName}</strong></> : 'You were invited to Socion'} — finish your profile to unlock 7 days of Premium.
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <p className="eyebrow">Step 3 of 4</p>
              <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
                Your <em>profile</em>
              </h1>
              {type && (
                <>
                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                    Type: <strong style={{ color: 'var(--accent)' }}>{type}</strong>
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                    Working hypothesis ·{' '}
                    <a href="/typing" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      get a written typing report
                    </a>
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input-standalone" placeholder="First name or alias" value={name} onChange={e => setName(e.target.value)} />
              <div>
                <input
                  className="input-standalone"
                  type="date"
                  value={dob}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  onChange={e => setDob(e.target.value)}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Date of birth — only your age is shown on your card, never your DOB.
                </p>
              </div>
              <select
                className="input-standalone"
                value={gender}
                onChange={e => setGender(e.target.value)}
                style={{ fontFamily: 'var(--sans)' }}
              >
                <option value="">Gender (optional)</option>
                <option value="Man">Man</option>
                <option value="Woman">Woman</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              <select
                className="input-standalone"
                value={country}
                onChange={e => setCountry(e.target.value)}
                style={{ fontFamily: 'var(--sans)' }}
              >
                <option value="">Country (optional)</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <div>
                <input
                  className="input-standalone"
                  type="text"
                  placeholder="City (optional) — e.g. London, not Greater London"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={{ fontFamily: 'var(--sans)' }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Helps others know whether meeting up is realistic. Only your city is shown — never a postcode.
                </p>
              </div>
              <div>
                <textarea
                  className="input-standalone"
                  placeholder="A short bio — how you'd describe yourself to a stranger (optional)"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={4}
                  style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6 }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Visible to other users even in anonymous mode — keep it vague if you prefer privacy.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: anonymous ? 'rgba(154,111,56,0.05)' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={e => setAnonymous(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>🕵️ Anonymous mode</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>Hides your name, age, photo, and location from other users. Your type and relation are always visible. A 🕵️ badge shows on your card. You can turn this off at any time to reveal your details.</p>
                  {anonymous && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.5rem', lineHeight: 1.5, fontWeight: 500 }}>⚠️ Anonymous profiles are hidden by default in the feed. Most users never see them, which means significantly less engagement. Anonymous mode is fine for a quick look around, but it's not a viable long-term option if you want to make connections.</p>
                  )}
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: hideActivity ? 'rgba(154,111,56,0.05)' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={hideActivity}
                  onChange={e => setHideActivity(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>👁️ Hide activity status</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>Others won't see when you were last active and you won't appear in the "Online now" or "Active today" filters. You'll also appear lower in the feed while this is on.</p>
                </div>
              </label>
              {!savedType && (
                <div>
                  <select
                    className="input-standalone"
                    value={type}
                    onChange={e => setType(e.target.value)}
                    style={{ fontFamily: 'var(--sans)' }}
                  >
                    <option value="">Select your Socionics type…</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    Just your best guess for now — it's only a placeholder until you're typed properly.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={chatOptIn}
                      onChange={e => setChatOptIn(e.target.checked)}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                      Not sure at all? Check this and we'll take you straight into the free typing chat for a real read as soon as your account is created.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

            {(() => {
              const missing = [!name && 'your name or alias', !dob && 'your date of birth', !type && 'your Socionics type'].filter(Boolean)
              return missing.length > 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center' }}>
                  {missing.join(' and ')} {missing.length > 1 ? 'are' : 'is'} still needed to continue.
                </p>
              )
            })()}

            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (dob) {
                  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
                  if (age < 18) {
                    setError('You must be 18 or over to use Socion.')
                    return
                  }
                }
                setStep('relations')
              }}
              disabled={!name || !dob || !type}
              style={{ opacity: (!name || !dob || !type) ? 0.5 : 1 }}
            >
              Next — choose your dynamics
            </button>
          </div>
        </section>
      </Layout>
    )
  }

  return (
    <Layout noScroll hideFooter>
      <section style={centreStyle}>
        <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Step 4 of 4</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
              Which <em>dynamics</em> are you open to?
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.75rem', maxWidth: 460, margin: '0.75rem auto 0' }}>
              Select the intertype relations you want to match on. You can change these later.
            </p>
          </div>

          <RelationPicker selected={relations} onChange={setRelations} userType={type} />

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => setStep('details')}>Back</button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={loading || relations.length === 0}
              style={{ opacity: (loading || relations.length === 0) ? 0.5 : 1 }}
            >
              {loading ? 'Saving…' : 'Create profile'}
            </button>
          </div>
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
