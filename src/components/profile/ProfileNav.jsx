import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { label: 'Details',       to: '/profile/edit' },
  { label: 'Dynamics',      to: '/profile/dynamics' },
  { label: 'Notifications', to: '/profile/notifications' },
]

export default function ProfileNav() {
  const { pathname } = useLocation()

  return (
    <div style={{
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid var(--border)',
      marginBottom: '2rem',
      width: '100%',
    }}>
      {TABS.map(tab => {
        const active = pathname === tab.to
        return (
          <Link
            key={tab.to}
            to={tab.to}
            style={{
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
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
