import { useState, useEffect } from 'react'
import { usePushNotifications } from '../../lib/usePushNotifications'

export default function NotificationPrompt({ userId }) {
  const { supported, permission, subscribed, subscribe } = usePushNotifications(userId)

  useEffect(() => {
    if (!supported) return
    function recheck() {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setLocalSubscribed(true)
        })
      )
    }
    window.addEventListener('push-subscribed', recheck)
    return () => window.removeEventListener('push-subscribed', recheck)
  }, [supported])

  const [localSubscribed, setLocalSubscribed] = useState(false)

  if (!supported || permission === 'denied' || subscribed || localSubscribed) return null

  return (
    <button
      onClick={subscribe}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0.65rem 1.25rem',
        background: 'var(--surface)',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        fontSize: '0.75rem',
        color: 'var(--muted)',
        textAlign: 'left',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1.5a4 4 0 0 1 4 4v2.5l1 1.5H2l1-1.5V5.5a4 4 0 0 1 4-4z"/>
        <path d="M5.5 11a1.5 1.5 0 0 0 3 0"/>
      </svg>
      Enable message notifications
    </button>
  )
}
