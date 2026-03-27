import { RELATIONS } from '../../data/relations'
import { isMatchUnread } from '../../lib/useUnreadCount'

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

export default function MatchList({ matches, selectedId, onSelect, currentUserId }) {
  if (matches.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>
          No connections yet.<br />Go to the feed to connect with someone.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {matches.map(match => {
        const name = match.other.profile_data?.name ?? match.other.type
        const relName = RELATIONS[match.displayRelationType ?? match.relation_type]?.name ?? match.relation_type
        const isSelected = match.id === selectedId
        const last = match.lastMessage
        const unread = isMatchUnread(match, currentUserId)

        return (
          <button
            key={match.id}
            onClick={() => onSelect(match)}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.2rem',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              background: isSelected ? 'rgba(154,111,56,0.07)' : unread ? 'rgba(154,111,56,0.03)' : 'transparent',
              borderLeft: isSelected ? '2px solid var(--accent)' : unread ? '2px solid var(--accent-lt)' : '2px solid transparent',
              textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {unread && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                )}
                <span style={{ fontWeight: unread ? 500 : 400, fontSize: '0.92rem', color: 'var(--text)' }}>{name}</span>
              </div>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, flexShrink: 0 }}>
                {match.other.type}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {relName}
              </span>
              {last && (
                <span style={{ fontSize: '0.68rem', color: unread ? 'var(--accent)' : 'var(--muted)', flexShrink: 0, fontWeight: unread ? 500 : 400 }}>
                  {timeAgo(last.created_at)}
                </span>
              )}
            </div>
            {last && (
              <p style={{ fontSize: '0.78rem', color: unread ? 'var(--text)' : 'var(--muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', fontWeight: unread ? 500 : 400 }}>
                {last.content}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
