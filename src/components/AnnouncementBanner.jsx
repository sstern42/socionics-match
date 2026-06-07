import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BANNER_KEY = 'socion_site_banner_dismissed_'

function dismissKey(text) {
  try { return BANNER_KEY + btoa(encodeURIComponent(text)).slice(0, 8) }
  catch { return BANNER_KEY + text.length }
}

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    supabase
      .from('stats')
      .select('site_banner, site_banner_active')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.site_banner_active && data?.site_banner) {
          const dismissed = localStorage.getItem(dismissKey(data.site_banner)) === 'true'
          if (!dismissed) {
            setBanner(data.site_banner)
            setVisible(true)
          }
        }
      })
  }, [])

  function dismiss() {
    if (!banner) return
    localStorage.setItem(dismissKey(banner), 'true')
    setVisible(false)
    window.umami?.track('site-banner-dismissed')
  }

  if (!visible || !banner) return null

  return (
    <div
      role="banner"
      aria-label="Site announcement"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        background: '#1a1612',
        borderBottom: '1px solid rgba(212,175,90,0.25)',
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        position: 'relative',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
        {banner}
      </span>

      <a
        href="/support"
        onClick={() => window.umami?.track('site-banner-cta-clicked')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.25rem 0.75rem',
          border: '1px solid rgba(212,175,90,0.55)',
          borderRadius: '3px',
          color: '#d4af5a',
          fontSize: '0.75rem',
          fontWeight: 500,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(212,175,90,0.12)'
          e.currentTarget.style.borderColor = 'rgba(212,175,90,0.85)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'rgba(212,175,90,0.55)'
        }}
      >
        Support Socion ♥
      </a>

      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.35)',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
      >
        ✕
      </button>
    </div>
  )
}
