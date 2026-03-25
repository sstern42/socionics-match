import { RELATIONS } from '../../data/relations'

const RELATION_COLOURS = {
  DUAL:           { bg: 'rgba(154,111,56,0.10)', border: 'var(--accent)', text: 'var(--accent)' },
  ACTIVITY:       { bg: 'rgba(154,111,56,0.07)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  MIRROR:         { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  SEMI_DUAL:      { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  KINDRED:        { bg: 'rgba(154,111,56,0.04)', border: 'var(--border)', text: 'var(--muted)' },
  BUSINESS:       { bg: 'rgba(154,111,56,0.04)', border: 'var(--border)', text: 'var(--muted)' },
  BENEFACTOR:     { bg: 'rgba(154,111,56,0.04)', border: 'var(--border)', text: 'var(--muted)' },
  BENEFICIARY:    { bg: 'rgba(154,111,56,0.04)', border: 'var(--border)', text: 'var(--muted)' },
  QUASI_IDENTITY: { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' },
  ILLUSIONARY:    { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' },
  CONTRARY:       { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' },
  SUPERVISOR:     { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' },
  SUPERVISEE:     { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' },
  SUPER_EGO:      { bg: 'rgba(180,60,60,0.05)', border: 'rgba(180,60,60,0.3)', text: '#b43c3c' },
  CONFLICT:       { bg: 'rgba(180,60,60,0.05)', border: 'rgba(180,60,60,0.3)', text: '#b43c3c' },
  IDENTITY:       { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' },
}

export default function ProfileCard({ profile, onConnect, alreadyMatched }) {
  const { profile_data, type, relation, location } = profile
  const name = profile_data?.name ?? 'Unknown'
  const age = profile_data?.age
  const bio = profile_data?.bio
  const relInfo = RELATIONS[relation]
  const colours = RELATION_COLOURS[relation] ?? RELATION_COLOURS.IDENTITY

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${colours.border}`,
      borderRadius: 6,
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 500 }}>
            {name}{age ? `, ${age}` : ''}
          </h3>
          {location && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{location}</p>
          )}
        </div>
        <span style={{
          fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          fontWeight: 500, color: colours.text,
          background: colours.bg, border: `1px solid ${colours.border}`,
          padding: '0.25rem 0.6rem', borderRadius: 3,
        }}>
          {type}
        </span>
      </div>

      {/* Relation badge */}
      {relInfo && (
        <div style={{
          background: colours.bg,
          border: `1px solid ${colours.border}`,
          borderRadius: 4, padding: '0.6rem 0.85rem',
        }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: colours.text, fontWeight: 500 }}>
            {relInfo.name}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
            {relInfo.description}
          </p>
        </div>
      )}

      {/* Bio */}
      {bio && (
        <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 300 }}>
          {bio.length > 200 ? bio.slice(0, 200) + '…' : bio}
        </p>
      )}

      {/* Action */}
      <button
        className={alreadyMatched ? 'btn-ghost' : 'btn-primary'}
        onClick={() => onConnect(profile)}
        disabled={alreadyMatched}
        style={{
          opacity: alreadyMatched ? 0.5 : 1,
          cursor: alreadyMatched ? 'default' : 'pointer',
          marginTop: '0.25rem',
        }}
      >
        {alreadyMatched ? 'Already connected' : 'Connect'}
      </button>
    </div>
  )
}
