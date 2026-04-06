import { useState, useEffect } from 'react'
import { usePushNotifications } from '../../lib/usePushNotifications'

const STORAGE_KEY = 'socion_push_modal_seen'

export default function PushModal({ userId }) {
  const { supported, permission, subscribed, subscribe, subscribeError } = usePushNotifications(userId)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supported || permission === 'denied' || subscribed) return
    if (localStorage.getItem(STORAGE_KEY)) return
    // Short delay so the page settles before the modal appears
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [supported, permission, subscribed])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    window.umami?.track('push-modal-dismissed')
    setVisible(false)
  }

  async function handleEnable() {
    setLoading(true)
    const err = await subscribe()
    setLoading(false)
    window.umami?.track('push-notifications-enabled')
    if (!err) dismiss()
  }

  if (!visible) return null

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 6, padding: '2rem',
          width: '100%', maxWidth: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🔔</span>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 500 }}>
            Stay in the conversation
          </h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7 }}>
          Enable push notifications and you'll know instantly when someone messages you — no need to keep the app open.
        </p>
        {subscribeError && (
          <p style={{ fontSize: '0.8rem', color: '#c0392b', lineHeight: 1.5 }}>{subscribeError}</p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={dismiss}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.78rem' }}
          >
            Not now
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleEnable}
            disabled={loading}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.78rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Enabling…' : 'Enable notifications'}
          </button>
        </div>
      </div>
    </div>
  )
}
