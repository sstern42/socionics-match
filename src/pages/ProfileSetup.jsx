import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import RelationPicker from '../components/profile/RelationPicker'
import { useAuth } from '../lib/AuthContext'
import { createProfile } from '../lib/profile'

const STEPS = ['details', 'relations', 'done']

export default function ProfileSetup() {
  const { session, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Pull type from sessionStorage if set during onboarding
  const savedType = sessionStorage.getItem('socion_type') || ''
  const savedConfidence = JSON.parse(sessionStorage.getItem('socion_confidence') || 'null')

  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState(savedType)
  const [relations, setRelations] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      await createProfile({
        authId: session.user.id,
        type,
        typeConfidence: savedConfidence ?? { [type]: 1.0 },
        profileData: { name, age: parseInt(age), bio, location },
      })
      refreshProfile()
      setStep('done')
      sessionStorage.removeItem('socion_type')
      sessionStorage.removeItem('socion_confidence')
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
              <p className="eyebrow">Step 2 of 3</p>
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
              <input className="input-standalone" placeholder="First name" value={name} onChange={e => setName(e.target.value)} />
              <input className="input-standalone" placeholder="Age" type="number" min="18" max="99" value={age} onChange={e => setAge(e.target.value)} />
              <input className="input-standalone" placeholder="Location (city, country)" value={location} onChange={e => setLocation(e.target.value)} />
              <textarea
                className="input-standalone"
                placeholder="A short bio — how you'd describe yourself to a stranger"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6 }}
              />
              {!type && (
                <input className="input-standalone" placeholder="Your Socionics type (e.g. LII)" value={type} onChange={e => setType(e.target.value.toUpperCase())} />
              )}
            </div>

            {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

            <button
              className="btn-primary"
              onClick={() => setStep('relations')}
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

  if (step === 'relations') {
    return (
      <Layout>
        <section style={centreStyle}>
          <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p className="eyebrow">Step 3 of 3</p>
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
              <button className="btn-ghost" onClick={() => setStep('details')}>Back</button>
              <button
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

  return (
    <Layout>
      <section style={centreStyle}>
        <p className="eyebrow fade-up-1">Profile created</p>
        <h1 className="fade-up-2" style={{ fontSize: 'clamp(2rem,5vw,4rem)' }}>
          Welcome to <em>Socion</em>
        </h1>
        <p className="fade-up-3" style={{ color: 'var(--muted)', maxWidth: 400, textAlign: 'center' }}>
          Matching is coming in the next phase. Your profile and type preferences are saved.
        </p>
        <button className="btn-primary fade-up-4" onClick={() => navigate('/')}>Back to home</button>
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
