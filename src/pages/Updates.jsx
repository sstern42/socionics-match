import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'

const COMING_ITEMS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="10" cy="12" r="1.75" fill="currentColor" stroke="none"/>
        <path d="M6.5 9.5a5 5 0 0 1 7 0"/>
        <path d="M4 7a8 8 0 0 1 12 0"/>
      </svg>
    ),
    label: 'Founder notes',
    description: 'What\'s being built, what broke, and why certain decisions were made.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,14 6,9 9,11 13,6 18,10"/>
        <line x1="2" y1="17" x2="18" y2="17"/>
      </svg>
    ),
    label: 'Member & connection milestones',
    description: 'Live numbers as the network grows — members, connections, types represented.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="6" height="6" rx="1"/>
        <rect x="11" y="3" width="6" height="6" rx="1"/>
        <rect x="3" y="11" width="6" height="6" rx="1"/>
        <rect x="11" y="11" width="6" height="6" rx="1"/>
      </svg>
    ),
    label: 'Relation type data',
    description: 'Which dynamics are most connected, highest rated, most active. The theory tested in real time.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2l2 6h6l-5 3.5 2 6L10 14l-5 3.5 2-6L2 8h6z"/>
      </svg>
    ),
    label: 'Feature launches',
    description: 'New things landing in the app, with context on what they are and why they exist.',
  },
]

export default function Updates() {
  const { profile } = useAuth()
  const isFounder = profile?.is_founding_member === true
  const isPremium = isFounder || profile?.plan_status === 'active' || profile?.plan_status === 'past_due'

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(154,111,56,0.08)', border: '1px solid var(--accent-lt)', borderRadius: 20, padding: '0.3rem 0.85rem' }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="10" cy="12" r="1.75" fill="var(--accent)" stroke="none"/>
            <path d="M6.5 9.5a5 5 0 0 1 7 0"/>
            <path d="M4 7a8 8 0 0 1 12 0"/>
          </svg>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500 }}>Coming soon</span>
        </div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginBottom: '0.75rem' }}>
          Updates from <em>Spencer</em>
        </h1>

        <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.75, marginBottom: '3rem', maxWidth: 460 }}>
          A direct feed from the founder — milestones, data, product decisions, and what's happening behind the scenes. No social media required.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', borderTop: '1px solid var(--border)' }}>
          {COMING_ITEMS.map(({ icon, label, description }) => (
            <div
              key={label}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                padding: '1.25rem 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                background: 'rgba(154,111,56,0.07)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>{label}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>{description}</p>
              </div>
            </div>
          ))}
        </div>

        {isFounder && (
          <div style={{ marginTop: '2.5rem', background: 'rgba(154,111,56,0.06)', border: '1px solid var(--accent)', borderRadius: 8, padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--accent)', marginBottom: '0.35rem' }}>
              Founding member ✦
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.65 }}>
              You'll have full access to this feed when it launches — as thanks for being here from the start.
            </p>
          </div>
        )}

        <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/feed" style={{ fontSize: '0.82rem', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Back to matches
          </Link>
          <Link
            to="/changelog"
            onClick={() => localStorage.setItem('socion_changelog_seen', '')}
            style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none' }}
          >
            What's new so far →
          </Link>
        </div>

      </section>
    </Layout>
  )
}
