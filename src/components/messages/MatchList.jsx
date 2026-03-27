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

export default function MatchList({ matches, selectedId, onSelect }) {
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

        return (
          <button
            key={match.id}
            onClick={() => onSelect(match)}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.2rem',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              background: isSelected ? 'rgba(154,111,56,0.07)' : 'transparent',
              borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
              textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 500, fontSize: '0.92rem', color: 'var(--text)' }}>{name}</span>
              <span style={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, flexShrink: 0 }}>
                {match.other.type}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {relName}
              </span>
              {last && (
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
                  {timeAgo(last.created_at)}
                </span>
              )}
            </div>
            {last && (
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {last.content}
              </p>
            )}
          </button>
        )
      })}</div>
  )
}
