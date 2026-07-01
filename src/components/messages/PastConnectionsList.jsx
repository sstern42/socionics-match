import { useNavigate } from 'react-router-dom'
import { RELATIONS } from '../../data/relations'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Read-only list of unmatched connections — clicking opens the profile, not a
// conversation, since messages stay hidden after disconnecting (#822).
export default function PastConnectionsList({ connections }) {
  const navigate = useNavigate()

  if (connections.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>
          No past connections.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {connections.map(conn => {
        const isOtherAnonymous = conn.other.profile_data?.anonymous ?? false
        const name = isOtherAnonymous ? 'Anonymous' : (conn.other.profile_data?.name ?? conn.other.type)
        const relName = RELATIONS[conn.displayRelationType ?? conn.relation_type]?.name ?? conn.relation_type
        const avatarUrl = isOtherAnonymous ? null : conn.other.avatar_url
        const initial = isOtherAnonymous ? '🕵️' : (conn.other.profile_data?.name?.[0]?.toUpperCase() ?? '?')

        return (
          <button
            key={conn.id}
            onClick={() => { navigate(`/profile/${conn.other.id}`); window.umami?.track('past-connection-profile-clicked') }}
            className="match-list-item"
            style={{
              display: 'flex', flexDirection: 'row', gap: '0.75rem', alignItems: 'flex-start',
              padding: '0.9rem 1.25rem',
              border: 'none',
              background: 'transparent',
              borderLeft: '2px solid transparent',
              textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s',
              opacity: 0.85,
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '0.1rem',
              }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'var(--serif)', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1 }}>{initial}</span>
              }
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.92rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, flexShrink: 0 }}>
                  {conn.other.type}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {relName}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
                  Disconnected {timeAgo(conn.unmatched_at)}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
