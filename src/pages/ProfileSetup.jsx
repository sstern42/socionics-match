import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import RelationPicker from '../components/profile/RelationPicker'
import { useAuth } from '../lib/AuthContext'
import { createProfile, updateRelationPreferences, createTypeAssessment } from '../lib/profile'
import { COUNTRIES } from '../data/countries'

export default function ProfileSetup() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Guard: if the user already has a profile (e.g. navigated back here, or
  // refreshed mid-onboarding), send them straight to the feed.
  useEffect(() => {
    if (profile) navigate('/feed', { replace: true })
  }, [profile])

  const savedType = sessionStorage.getItem('socion_type') || localStorage.getItem('socion_type') || ''
  const savedConfidence = JSON.parse(sessionStorage.getItem('socion_confidence') || localStorage.getItem('socion_confidence') || 'null')
  const savedAnswers = JSON.parse(sessionStorage.getItem('socion_answers') || localStorage.getItem('socion_answers') || '{}')
  const savedPurpose = JSON.parse(sessionStorage.getItem('socion_purpose') || localStorage.getItem('socion_purpose') || '["dating"]')

  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [type, setType] = useState(savedType)
  const [relations, setRelations] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const newProfile = await createProfile({
        authId: session.user.id,
        type,
        typeConfidence: savedConfidence ?? { [type]: 1.0 },
        profileData: { name, age: parseInt(age), gender, bio, country, anonymous },
        purpose: savedPurpose,
      })

      if (!newProfile) {
        throw new Error('Profile was not created — check Supabase RLS policies.')
      }

      if (relations.length > 0) {
        await updateRelationPreferences(newProfile.id, relations)
      }

      // Save raw assessment data for research — only if user took the questionnaire
      if (Object.keys(savedAnswers).length > 0) {
        await createTypeAssessment({
          userId: newProfile.id,
          responses: savedAnswers,
          typeDistribution: savedConfidence ?? { [type]: 1.0 },
        })
      }

      sessionStorage.removeItem('socion_type')
      sessionStorage.removeItem('socion_confidence')
      sessionStorage.removeItem('socion_answers')
      sessionStorage.removeItem('socion_purpose')
      localStorage.removeItem('socion_type')
      localStorage.removeItem('socion_confidence')
      localStorage.removeItem('socion_answers')
      localStorage.removeItem('socion_purpose')

      await refreshProfile()

      // Track signup — retry until Umami is ready (defer loading means it may not be available immediately)
      const trackSignup = (attempts = 0) => {
        if (window.umami) {
          window.umami.track('signup-completed', { type, purpose: savedPurpose?.join(',') ?? '' })
          navigate('/feed')
        } else if (attempts < 10) {
          setTimeout(() => trackSignup(attempts + 1), 500)
        } else {
          // Umami never loaded — navigate anyway
          navigate('/feed')
        }
      }
      trackSignup()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'details') {
    return (
      <Layout>
        <section style={centreStyle}>
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p className="eyebrow">Step 3 of 4</p>
              <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
                Your <em>profile</em>
              </h1>
              {type && (
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                  Type: <strong style={{ color: 'var(--accent)' }}>{type}</strong>
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input-standalone" placeholder="First name or alias" value={name} onChange={e => setName(e.target.value)} />
              <input className="input-standalone" placeholder="Age" type="number" min="18" max="99" value={age} onChange={e => setAge(e.target.value)} />
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
              <textarea
                className="input-standalone"
                placeholder="A short bio — how you'd describe yourself to a stranger"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6 }}
              />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: anonymous ? 'rgba(154,111,56,0.05)' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={e => setAnonymous(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>🔒 Anonymous mode</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>Your type and relation are always shown. Name, age, photo, and location are visible as you choose — anonymous mode adds a 🔒 badge so others know you prefer privacy.</p>
                </div>
              </label>
              {!savedType && (
                <input
                  className="input-standalone"
                  placeholder="Your Socionics type (e.g. LII)"
                  value={type}
                  onChange={e => setType(e.target.value.toUpperCase())}
                />
              )}
            </div>

            {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (parseInt(age) < 18) {
                  setError('You must be 18 or over to use Socion.')
                  return
                }
                setStep('relations')
              }}
              disabled={!name || !age || !type}
              style={{ opacity: (!name || !age || !type) ? 0.5 : 1 }}
            >
              Next — choose your dynamics
            </button>
          </div>
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
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

          <RelationPicker selected={relations} onChange={setRelations} />

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
