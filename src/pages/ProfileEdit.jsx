import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import RelationPicker from '../components/profile/RelationPicker'
import { useAuth } from '../lib/AuthContext'
import { updateRelationPreferences } from '../lib/profile'

export default function ProfileEdit() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [relations, setRelations] = useState(profile?.relation_preferences ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateRelationPreferences(profile.id, relations)
      await refreshProfile()
      setSaved(true)
      setTimeout(() => navigate('/feed'), 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <section style={centreStyle}>
        <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Your profile</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
              Update your <em>dynamics</em>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.75rem' }}>
              Changes apply immediately to your matching feed.
            </p>
          </div>

          <RelationPicker selected={relations} onChange={setRelations} />

          {error && (
            <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>
          )}

          {saved && (
            <p style={{ fontSize: '0.82rem', color: 'var(--accent)', textAlign: 'center' }}>Saved — returning to feed…</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => navigate('/feed')}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || relations.length === 0}
              style={{ opacity: (saving || relations.length === 0) ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
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
