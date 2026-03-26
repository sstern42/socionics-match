import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import RelationPicker from '../components/profile/RelationPicker'
import { useAuth } from '../lib/AuthContext'
import { updateProfileData, updateRelationPreferences, updatePurpose, uploadAvatar } from '../lib/profile'
import { TYPES } from '../data/relations'
import { COUNTRIES } from '../data/countries'
import PurposePicker from '../components/profile/PurposePicker'
import ProfileCard from '../components/feed/ProfileCard'

export default function ProfileEdit() {
  const { profile, refreshProfile, session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !session) navigate('/auth', { replace: true })
  }, [session, loading])

  const [step, setStep] = useState('details')

  const [name, setName] = useState(profile?.profile_data?.name ?? '')
  const [age, setAge] = useState(profile?.profile_data?.age?.toString() ?? '')
  const [bio, setBio] = useState(profile?.profile_data?.bio ?? '')
  const [country, setCountry] = useState(profile?.profile_data?.country ?? '')
  const [type, setType] = useState(profile?.type ?? '')

  const [purposes, setPurposes] = useState(profile?.purpose ?? ['dating'])
  const [relations, setRelations] = useState(profile?.relation_preferences ?? [])
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      let avatarUrl = undefined
      if (avatarFile) {
        avatarUrl = await uploadAvatar(profile.auth_id, avatarFile)
      }
      await Promise.all([
        updateProfileData(profile.id, {
          profileData: { name, age: parseInt(age), bio, country },
          type: type.toUpperCase(),
          avatarUrl,
        }),
        updateRelationPreferences(profile.id, relations),
        updatePurpose(profile.id, purposes),
      ])
      await refreshProfile()
      navigate('/feed')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const typeValid = TYPES.includes(type.toUpperCase())

  if (loading || !session) return (
    <Layout>
      <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    </Layout>
  )

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
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '0.5rem' }}
              >
                Preview card →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'var(--bg-secondary, #f0ede6)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.5rem', color: 'var(--muted)' }}>{name ? name[0].toUpperCase() : '?'}</span>
                  }
                </div>
                <div>
                  <label style={{
                    display: 'inline-block', cursor: 'pointer',
                    fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--accent)', border: '1px solid var(--accent-lt)',
                    padding: '0.4rem 0.9rem', borderRadius: 3,
                  }}>
                    {avatarPreview ? 'Change photo' : 'Add photo'}
                    <input
                      type="file" accept="image/*" onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {avatarPreview && (
                    <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                      style={{ marginLeft: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
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

        {/* Profile preview modal */}
        {showPreview && (
          <div
            onClick={() => setShowPreview(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2rem',
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380 }}>
              <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem', textAlign: 'center' }}>
                How others see your card
              </p>
              <ProfileCard
                profile={{
                  profile_data: { name, age: parseInt(age) || null, bio, country },
                  type,
                  relation: null,
                  displayRelation: null,
                  avatar_url: avatarPreview,
                }}
                onConnect={() => {}}
                alreadyMatched={false}
                matchId={null}
                connecting={false}
              />
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{ display: 'block', margin: '1rem auto 0', background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, padding: '0.5rem 1.5rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
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

          <div>
            <p style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>Looking for</p>
            <PurposePicker selected={purposes} onChange={setPurposes} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>Dynamics</p>
            <RelationPicker selected={relations} onChange={setRelations} />
          </div>

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => setStep('details')}>
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || relations.length === 0 || purposes.length === 0}
              style={{ opacity: (saving || relations.length === 0 || purposes.length === 0) ? 0.5 : 1 }}
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
