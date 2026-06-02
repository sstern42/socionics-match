import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'

const TABS = [
  { label: 'Details',       to: '/profile/edit' },
  { label: 'Dynamics',      to: '/profile/dynamics' },
  { label: 'Notifications', to: '/profile/notifications' },
]

export default function ProfileNav() {
  const { pathname } = useLocation()
  const { profile } = useAuth()

  const linkStyle = (active) => ({
    padding: '0.65rem 1.25rem',
    fontSize: '0.78rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: active ? 'var(--accent)' : 'var(--muted)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: '-1px',
    transition: 'color 0.15s',
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 0,
      borderBottom: '1px solid var(--border)',
      marginBottom: '2rem',
      width: '100%',
    }}>
      {/* Main tabs — natural width, never grow */}
      <div style={{ display: 'flex', flex: '0 0 auto' }}>
        {TABS.map(tab => (
          <Link key={tab.to} to={tab.to} style={linkStyle(pathname === tab.to)}>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* View profile + Help — pushed right on desktop, wrap to next line on mobile */}
      <div style={{ display: 'flex', marginLeft: 'auto' }}>
        {profile?.id && (
          <Link
            to={`/profile/${profile.id}`}
            onClick={() => window.umami?.track('view-own-profile-clicked')}
            style={linkStyle(pathname === `/profile/${profile.id}`)}
            title="See your profile as others do"
          >
            View profile
          </Link>
        )}
        <Link to="/help" style={linkStyle(false)}>
          Help
        </Link>
      </div>
    </div>
  )
}
