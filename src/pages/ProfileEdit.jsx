import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import RelationPicker from '../components/profile/RelationPicker'
import { useAuth } from '../lib/AuthContext'
import { updateProfileData, updateRelationPreferences } from '../lib/profile'
import { TYPES } from '../data/relations'

export default function ProfileEdit() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('details')

  const [name, setName] = useState(profile?.profile_data?.name ?? '')
  const [age, setAge] = useState(profile?.profile_data?.age?.toString() ?? '')
  const [bio, setBio] = useState(profile?.profile_data?.bio ?? '')
  const [location, setLocation] = useState(profile?.profile_data?.location ?? '')
  const [type, setType] = useState(profile?.type ?? '')

  const [relations, setRelations] = useState(profile?.relation_preferences ?? [])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all([
        updateProfileData(profile.id, {
          profileData: { name, age: parseInt(age), bio, location },
          type: type.toUpperCase(),
        }),
        updateRelationPreferences(profile.id, relations),
      ])
      await refreshProfile()
      navigate('/feed')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const typeValid = TYPES.includes(type.toUpperCase())

  if (step === 'details') {
    return (
      <Layout>
        <section style={centreStyle}>
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p className="eyebrow">Edit profile</p>
              <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
                Your <em>details</em>
              </h1>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                className="input-standalone"
                placeholder="First name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                className="input-standalone"
                placeholder="Age"
                type="number"
                min="18"
                max="99"
                value={age}
                onChange={e => setAge(e.target.value)}
              />
              <input
                className="input-standalone"
                placeholder="Location (city, country)"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
              <textarea
                className="input-standalone"
                placeholder="A short bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6 }}
              />
              <div>
                <input
                  className="input-standalone"
                  placeholder="Socionics type (e.g. LII)"
                  value={type}
                  onChange={e => setType(e.target.value.toUpperCase())}
                />
                {type && !typeValid && (
                  <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.25rem' }}>
                    Not a recognised type — check spelling.
                  </p>
                )}
              </div>
            </div>

            {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button type="button" className="btn-ghost" onClick={() => navigate('/feed')}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setStep('relations')}
                disabled={!name || !age || !typeValid}
                style={{ opacity: (!name || !age || !typeValid) ? 0.5 : 1 }}
              >
                Next — dynamics
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
        <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Edit profile</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
              Your <em>dynamics</em>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.75rem' }}>
              Changes apply immediately to your matching feed.
            </p>
          </div>

          <RelationPicker selected={relations} onChange={setRelations} />

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => setStep('details')}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || relations.length === 0}
              style={{ opacity: (saving || relations.length === 0) ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save changes'}
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
