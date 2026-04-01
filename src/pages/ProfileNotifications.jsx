import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { updateProfileData } from '../lib/profile'
import { usePushNotifications } from '../lib/usePushNotifications'
import ProfileNav from '../components/profile/ProfileNav'

export default function ProfileNotifications() {
  const { profile, refreshProfile, session, loading } = useAuth()
  const navigate = useNavigate()

  const [emailNotifications, setEmailNotifications] = useState(profile?.profile_data?.email_notifications ?? true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const {
    supported: pushSupported,
    permission: pushPermission,
    subscribed: pushSubscribed,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePushNotifications(profile?.id)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      await updateProfileData(profile.id, {
        profileData: {
          ...profile.profile_data,
          email_notifications: emailNotifications,
        },
      })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
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
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p className="eyebrow">Profile</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>Your <em>notifications</em></h1>
          </div>

          <ProfileNav />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Email */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: emailNotifications ? 'transparent' : 'rgba(154,111,56,0.05)' }}>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={e => setEmailNotifications(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>✉️ Email notifications</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  Receive an email when you get a new message. Automatically suppressed if push notifications are enabled.
                </p>
              </div>
            </label>

            {/* Push */}
            {pushSupported && pushPermission !== 'denied' && (
              <label
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: pushSubscribed ? 'rgba(154,111,56,0.05)' : 'transparent' }}
                onClick={e => { e.preventDefault(); pushSubscribed ? pushUnsubscribe() : pushSubscribe() }}
              >
                <input
                  type="checkbox"
                  checked={pushSubscribed}
                  readOnly
                  style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>🔔 Push notifications</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                    {pushPermission === 'granted'
                      ? pushSubscribed
                        ? 'Push notifications are on. New messages will appear on your device instantly.'
                        : 'Push notifications are off for this device.'
                      : 'Get instant alerts for new messages on this device. Takes effect immediately.'}
                  </p>
                </div>
              </label>
            )}

            {pushPermission === 'denied' && (
              <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>🔔 Push notifications</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  Blocked in your browser settings. To enable, update permissions for socion.app in your browser.
                </p>
              </div>
            )}

          </div>

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => navigate('/feed')}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save notifications'}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  )
}

const centreStyle = { minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5.5rem 1.5rem 4rem', gap: '2rem' }
