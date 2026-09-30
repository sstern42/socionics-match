import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { updateProfileData } from '../lib/profile'
import { setEmailNotifications as saveEmailNotifications, setMarketingPreference, MARKETING_SOURCES } from '../lib/emailPreferences'
import { usePushNotifications } from '../lib/usePushNotifications'
import ProfileNav from '../components/profile/ProfileNav'

export default function ProfileNotifications() {
  usePageTitle('Notifications')
  const { profile, refreshProfile, session, loading } = useAuth()
  const navigate = useNavigate()

  const [emailNotifications, setEmailNotifications] = useState(
    profile?.email_notifications ?? true
  )
  const [roomNotifications, setRoomNotifications] = useState(
    profile?.profile_data?.room_notifications ?? false
  )
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState(null)

  // Marketing consent saves on its own, straight away, so it can't be
  // mistaken for part of the service-notification settings above it.
  const [marketingSaving, setMarketingSaving] = useState(false)
  const [marketingError, setMarketingError]   = useState(null)
  const marketingOptIn = profile?.marketing_opt_in === true

  const {
    supported: pushSupported,
    permission: pushPermission,
    subscribed: pushSubscribed,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
    subscribeError: pushError,
  } = usePushNotifications(profile?.id)

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setError(null)
    try {
      await updateProfileData(profile.id, {
        profileData: {
          ...profile.profile_data,
          room_notifications: roomNotifications,
        },
      })
      if (emailNotifications !== (profile.email_notifications ?? true)) {
        await saveEmailNotifications(emailNotifications)
      }
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleMarketingToggle(next) {
    if (!profile || marketingSaving) return
    setMarketingSaving(true)
    setMarketingError(null)
    try {
      await setMarketingPreference(next, MARKETING_SOURCES.settings)
      await refreshProfile()
    } catch (err) {
      setMarketingError(err.message)
    } finally {
      setMarketingSaving(false)
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
            <div>
              <p style={sectionLabelStyle}>Account notifications</p>
              <p style={sectionNoteStyle}>
                Service emails and alerts about activity on your account. These aren't marketing, and you'll keep getting essential account emails (such as billing) while you have an account.
              </p>
            </div>

            {/* Email */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', background: emailNotifications ? 'transparent' : 'rgba(154,111,56,0.05)' }}>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={e => setEmailNotifications(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>✉️ Message notification emails</p>
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
                  {pushError && (
                    <p style={{ fontSize: '0.78rem', color: '#c0392b', marginTop: '0.4rem', lineHeight: 1.5 }}>{pushError}</p>
                  )}
                </div>
              </label>
            )}

            {/* Room notifications — only shown when push is subscribed */}
            {pushSubscribed && (
              <label
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem', // indent under push
                  border: '1px solid var(--border)', borderRadius: 4,
                  cursor: 'pointer',
                  background: roomNotifications ? 'rgba(154,111,56,0.05)' : 'transparent',
                  borderLeft: '3px solid var(--accent-lt)',
                }}
              >
                <input
                  type="checkbox"
                  checked={roomNotifications}
                  onChange={e => setRoomNotifications(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>💬 Quadra room notifications</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                    Get notified when someone posts in your quadra room. At most one notification every 5 minutes to avoid noise.
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

          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Notifications not working?{' '}
            <Link to="/help#notifications" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              See the fix guide →
            </Link>
          </p>

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

          {/* Marketing consent — deliberately separate from the service
              notifications above, with its own immediate save. */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <p style={sectionLabelStyle}>Socion updates</p>
              <p style={sectionNoteStyle}>Optional. Separate from the account notifications above.</p>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, cursor: marketingSaving ? 'default' : 'pointer', background: marketingOptIn ? 'rgba(154,111,56,0.05)' : 'transparent' }}>
              <input
                type="checkbox"
                checked={marketingOptIn}
                disabled={marketingSaving}
                onChange={e => handleMarketingToggle(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>📬 Socion updates by email</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  Occasional news about new features and the community, a few times a year at most. You can also unsubscribe from the link in any of these emails.
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                  {marketingSaving ? 'Saving…' : marketingOptIn ? '✓ Subscribed' : 'Not subscribed'}
                </p>
              </div>
            </label>
            {marketingError && <p style={{ fontSize: '0.82rem', color: '#c0392b', textAlign: 'center' }}>{marketingError}</p>}
          </div>
        </div>
      </section>
    </Layout>
  )
}

const sectionLabelStyle = {
  fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500,
}

const sectionNoteStyle = {
  fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.3rem', lineHeight: 1.5,
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '2rem 1.5rem 4rem',
  gap: '2rem',
}
