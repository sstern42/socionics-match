import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import RelationPicker from '../components/profile/RelationPicker'
import PurposePicker from '../components/profile/PurposePicker'
import { useAuth } from '../lib/AuthContext'
import { updateRelationPreferences, updatePurpose } from '../lib/profile'
import ProfileNav from '../components/profile/ProfileNav'

export default function ProfileDynamics() {
  const { profile, refreshProfile, session, loading } = useAuth()
  const navigate = useNavigate()

  const [purposes, setPurposes] = useState(profile?.purpose ?? ['dating'])
  const [relations, setRelations] = useState(profile?.relation_preferences ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      await Promise.all([
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

  if (loading || !session) return (
    <Layout noScroll hideFooter>
      <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    </Layout>
  )

  return (
    <Layout noScroll hideFooter>
      <section style={centreStyle}>
        <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Profile</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>Your <em>dynamics</em></h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.75rem' }}>Changes apply immediately to your matching feed.</p>
          </div>

          <ProfileNav />

          <div>
            <p style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>Looking for</p>
            <PurposePicker selected={purposes} onChange={setPurposes} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>Dynamics</p>
            <RelationPicker selected={relations} onChange={setRelations} userType={profile?.type} />
          </div>

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => navigate('/feed')}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || relations.length === 0 || purposes.length === 0}
              style={{ opacity: (saving || relations.length === 0 || purposes.length === 0) ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save dynamics'}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  )
}

const centreStyle = { 
  minHeight: 'calc(100vh - 72px)', 
  display: 'flex', 
  flexDirection: 'column', 
  alignItems: 'center', 
  justifyContent: 'flex-start',  // was 'center'
  padding: '2rem 1.5rem 4rem', 
  gap: '2rem' 
}
