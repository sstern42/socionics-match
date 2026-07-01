import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    supabase
      .from('stats')
      .select('site_banner, site_banner_active')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.site_banner_active && data?.site_banner) setBanner(data.site_banner)
      })
  }, [])

  if (!banner) return null

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
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: 'var(--muted)', textAlign: 'center' }}>
        {banner}
      </span>

      <a
        href="/support"
        onClick={() => window.umami?.track('site-banner-cta-clicked')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.25rem 0.75rem',
          border: '1px solid var(--accent)',
          borderRadius: '3px',
          color: 'var(--accent)',
          fontSize: '0.75rem',
          fontWeight: 500,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}
      >
        Support Socion ♥
      </a>
    </div>
  )
}
