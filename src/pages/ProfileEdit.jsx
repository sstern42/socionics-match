import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { updateProfileData, uploadAvatar } from '../lib/profile'
import { TYPES } from '../data/relations'
import { COUNTRIES } from '../data/countries'
import ProfileCard from '../components/feed/ProfileCard'
import ProfileNav from '../components/profile/ProfileNav'

export default function ProfileEdit() {
  const { profile, refreshProfile, session, loading } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(profile?.profile_data?.name ?? '')
  const [age, setAge] = useState(profile?.profile_data?.age?.toString() ?? '')
  const [gender, setGender] = useState(profile?.profile_data?.gender ?? '')
  const [bio, setBio] = useState(profile?.profile_data?.bio ?? '')
  const [country, setCountry] = useState(profile?.profile_data?.country ?? '')
  const [anonymous, setAnonymous] = useState(profile?.profile_data?.anonymous ?? false)
  const [type, setType] = useState(profile?.type ?? '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const typeValid = TYPES.includes(type.toUpperCase())

  async function handleSave() {
    if (!profile) return
    if (parseInt(age) < 18) { setError('You must be 18 or over to use Socion.'); return }
    setSaving(true)
    setError(null)
    try {
      let avatarUrl = undefined
      if (avatarFile) avatarUrl = await uploadAvatar(profile.auth_id, avatarFile)
      await updateProfileData(profile.id, {
        profileData: {
          name: name.trim().replace(/^\w/, c => c.toUpperCase()),
          age: parseInt(age),
          gender,
          bio,
          country,
          anonymous,
          email_notifications: profile.profile_data?.email_notifications ?? true,
        },
        type: type.toUpperCase(),
        avatarUrl,
      })
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

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const token = currentSession?.access_token
      if (!token) throw new Error('No session token — please sign in again')
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const text = await res.text()
      let json = {}
      try { json = JSON.parse(text) } catch { /* non-JSON response */ }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}: ${text}`)
      await supabase.auth.signOut()
    } catch (err) {
      setDeleteError(err.message ?? JSON.stringify(err))
      setDeleting(false)
    }
  }

  if (loading || !session) return (
    <Layout>
      <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <section style={centreStyle}>
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Profile</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>Your <em>details</em></h1>
            <button type="button" onClick={() => setShowPreview(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
              Preview card →
            </button>
          </div>

          <ProfileNav />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '1.5rem', color: 'var(--muted)' }}>{name ? name[0].toUpperCase() : '?'}</span>}
              </div>
              <div>
                <label style={{ display: 'inline-block', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', border: '1px solid var(--accent-lt)', padding: '0.4rem 0.9rem', borderRadius: 3 }}>
                  {avatarPreview ? 'Change photo' : 'Add photo'}
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
                {avatarPreview && (
                  <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null) }} style={{ marginLeft: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--muted)' }}>Remove</button>
                )}
              </div>
            </div>
            <input className="input-standalone" placeholder="First name or alias" value={name} onChange={e => setName(e.target.value)} />
            <input className="input-standalone" placeholder="Age" type="number" min="18" max="99" value={age} onChange={e => setAge(e.target.value)} />
            <select className="input-standalone" value={gender} onChange={e => setGender(e.target.value)} style={{ fontFamily: 'var(--sans)' }}>
              <option value="">Gender (optional)</option>
              <option value="Man">Man</option>
              <option value="Woman">Woman</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            <select className="input-standalone" value={country} onChange={e => setCountry(e.target.value)} style={{ fontFamily: 'var(--sans)' }}>
              <option value="">Country (optional)</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <textarea className="input-standalone" placeholder="A short bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6 }} />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: anonymous ? 'rgba(154,111,56,0.05)' : 'transparent' }}>
              <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>🔒 Anonymous mode</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>Your type and relation are always shown. Name, age, photo, and location are visible as you choose.</p>
              </div>
            </label>
            <div>
              <input className="input-standalone" placeholder="Socionics type (e.g. LII)" value={type} onChange={e => setType(e.target.value.toUpperCase())} />
              {type && !typeValid && <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.25rem' }}>Not a recognised type — check spelling.</p>}
            </div>
          </div>

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => navigate('/feed')}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !name || !age || !typeValid} style={{ opacity: (saving || !name || !age || !typeValid) ? 0.5 : 1 }}>
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </div>

          <div style={{ marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteError(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--muted)', letterSpacing: '0.02em', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Delete account
            </button>
          </div>
        </div>
      </section>



      {showDeleteModal && (
        <div onClick={() => !deleting && setShowDeleteModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>Delete your account?</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              This permanently deletes your profile, matches, and messages. There is no undo.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text)', margin: 0 }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              className="input-standalone"
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && deleteConfirm === 'DELETE' && handleDeleteAccount()}
              autoFocus
              disabled={deleting}
              style={{ fontFamily: 'var(--mono, monospace)', letterSpacing: '0.1em' }}
            />
            {deleteError && <p style={{ fontSize: '0.82rem', color: '#c0392b', margin: 0 }}>{deleteError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'DELETE'}
                style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 500, cursor: deleteConfirm === 'DELETE' && !deleting ? 'pointer' : 'not-allowed', opacity: (deleting || deleteConfirm !== 'DELETE') ? 0.5 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div onClick={() => setShowPreview(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380 }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem', textAlign: 'center' }}>How others see your card</p>
            <ProfileCard profile={{ profile_data: { name, age: parseInt(age) || null, gender, bio, country }, type, relation: null, displayRelation: null, avatar_url: avatarPreview }} onConnect={() => {}} alreadyMatched={false} matchId={null} connecting={false} />
            <button type="button" onClick={() => setShowPreview(false)} style={{ display: 'block', margin: '1rem auto 0', background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, padding: '0.5rem 1.5rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.06em' }}>Close</button>
          </div>
        </div>
      )}
    </Layout>
  )
}

const centreStyle = { minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', gap: '2rem' }
