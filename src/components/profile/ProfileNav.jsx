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
      gap: 0,
      borderBottom: '1px solid var(--border)',
      marginBottom: '2rem',
      width: '100%',
    }}>
      {TABS.map(tab => (
        <Link key={tab.to} to={tab.to} style={linkStyle(pathname === tab.to)}>
          {tab.label}
        </Link>
      ))}

      {/* View public profile — opens the page others see, including the gallery.
          Pushed to the right alongside Help. Only shown once we know the id. */}
      {profile?.id && (
        <Link
          to={`/profile/${profile.id}`}
          onClick={() => window.umami?.track('view-own-profile-clicked')}
          style={{ ...linkStyle(pathname === `/profile/${profile.id}`), marginLeft: 'auto' }}
          title="See your profile as others do"
        >
          View profile
        </Link>
      )}

      <Link
        to="/help"
        style={{ ...linkStyle(false), marginLeft: profile?.id ? 0 : 'auto' }}
      >
        Help
      </Link>
    </div>
  )
}
