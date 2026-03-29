import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'socion_ios_install_dismissed'

function isIOSSafari() {
  const ua = navigator.userAgent
  if (!/iphone|ipad|ipod/i.test(ua)) return false
  return /safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua)
}

function isInStandaloneMode() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
}

export default function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isIOSSafari() && !isInStandaloneMode() && !localStorage.getItem(DISMISSED_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0.75rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontSize: '0.82rem',
      color: 'var(--muted)',
    }}>
      {/* Share icon */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="7" width="12" height="9" rx="1.5"/>
        <polyline points="6,4 9,1 12,4"/>
        <line x1="9" y1="1" x2="9" y2="11"/>
      </svg>
      <span>
        Install Socion — tap <strong style={{ color: 'var(--accent)' }}>Share</strong> then <strong style={{ color: 'var(--accent)' }}>Add to Home Screen</strong>
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          marginLeft: 'auto',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted)',
          padding: '0.25rem',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="2" x2="12" y2="12"/>
          <line x1="12" y1="2" x2="2" y2="12"/>
        </svg>
      </button>
    </div>
  )
}
