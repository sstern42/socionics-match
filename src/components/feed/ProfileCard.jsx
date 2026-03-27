import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RELATIONS } from '../../data/relations'
import { countryFlag } from '../../data/countries'

const NEUTRAL = { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' }

const RELATION_COLOURS = {
  DUAL:           { bg: 'rgba(154,111,56,0.10)', border: 'var(--accent)', text: 'var(--accent)' },
  ACTIVITY:       { bg: 'rgba(154,111,56,0.07)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  MIRROR:         { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  SEMI_DUAL:      { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  KINDRED:        NEUTRAL,
  BUSINESS:       NEUTRAL,
  BENEFACTOR:     NEUTRAL,
  BENEFICIARY:    NEUTRAL,
  QUASI_IDENTITY: NEUTRAL,
  ILLUSIONARY:    NEUTRAL,
  CONTRARY:       NEUTRAL,
  SUPERVISOR:     NEUTRAL,
  SUPERVISEE:     NEUTRAL,
  SUPER_EGO:      NEUTRAL,
  CONFLICT:       NEUTRAL,
  IDENTITY:       NEUTRAL,
}

const PURPOSE_LABELS = {
  dating: 'Dating',
  friendship: 'Friendship',
  networking: 'Networking',
  team: 'Team building',
}

// matchId is the matches.id for an already-connected profile, or null if not yet connected
export default function ProfileCard({ profile, onConnect, alreadyMatched, matchId, connecting }) {
  const navigate = useNavigate()
  const [bioExpanded, setBioExpanded] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)
  const { profile_data, type, relation, displayRelation, purpose, last_active } = profile
  const name = profile_data?.name ?? 'Unknown'
  const age = profile_data?.age
  const gender = profile_data?.gender
  const bio = profile_data?.bio
  const role = profile_data?.role
  const flag = countryFlag(profile_data?.country)

  const activityLabel = (() => {
    if (!last_active) return null
    const diff = Date.now() - new Date(last_active).getTime()
    const hours = diff / 3600000
    if (hours < 24) return { label: 'Active today', colour: '#4caf50' }
    if (hours < 72) return { label: 'Active this week', colour: '#9a6f38' }
    if (hours < 168) return { label: 'Active this week', colour: '#9a6f38' }
    return null
  })()
  // displayRelation = what they are to you (e.g. SUPERVISOR)
  // relation = your role (e.g. SUPERVISEE) — used for connect/filter logic
  const relInfo = RELATIONS[displayRelation ?? relation]
  const colours = RELATION_COLOURS[displayRelation ?? relation] ?? RELATION_COLOURS.IDENTITY

  function handleAction() {
    if (alreadyMatched && matchId) {
      navigate(`/messages?match=${matchId}`)
    } else {
      onConnect(profile)
    }
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => profile.avatar_url && setPhotoModal(true)}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--bg-secondary, #f0ede6)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: profile.avatar_url ? 'zoom-in' : 'default',
              }}
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '1.1rem', color: 'var(--muted)', fontFamily: 'var(--serif)' }}>{name ? name[0].toUpperCase() : '?'}</span>
              }
            </div>
            {activityLabel && (
              <span title={activityLabel.label} style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 10, height: 10, borderRadius: '50%',
                background: activityLabel.colour,
                border: '2px solid #fff',
                display: 'block',
              }} />
            )}
          </div>

          {/* Photo modal */}
          {photoModal && profile.avatar_url && (
            <div
              onClick={() => setPhotoModal(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'zoom-out',
              }}
            >
              <img
                src={profile.avatar_url}
                alt={name}
                style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 6 }}
                onClick={e => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={() => setPhotoModal(false)}
                style={{
                  position: 'fixed', top: '1.5rem', right: '1.5rem',
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  borderRadius: '50%', width: 36, height: 36,
                  color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          )}
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 500, margin: 0 }}>
              {name}{age ? `, ${age}` : ''}{gender && gender !== 'Prefer not to say' ? ` · ${gender}` : ''}
            </h3>
            {role && (
              <span style={{
                display: 'inline-block', marginTop: '0.2rem',
                fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 600, color: '#fff',
                background: role === 'founder' ? '#2c2a22' : 'var(--accent)',
                padding: '0.15rem 0.5rem', borderRadius: 2,
              }}>
                {role}
              </span>
            )}
            {flag && (
              <p style={{ fontSize: '1rem', marginTop: '0.1rem', lineHeight: 1 }}>{flag}</p>
            )}
            {purpose?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                {purpose.map(p => (
                  <span key={p} style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 2, padding: '0.1rem 0.4rem' }}>
                    {PURPOSE_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <a
          href={`https://socionicsinsight.com/types/${type.toLowerCase()}/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            fontWeight: 500, color: colours.text,
            background: colours.bg, border: `1px solid ${colours.border}`,
            padding: '0.25rem 0.6rem', borderRadius: 3, flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          {type}
        </a>
      </div>

      {/* Relation badge */}
      {relInfo && (
        <div style={{
          background: colours.bg,
          border: `1px solid ${colours.border}`,
          borderRadius: 4, padding: '0.6rem 0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: colours.text, fontWeight: 500 }}>
              {relInfo.name}
            </p>
            {relInfo.siSlug && (
              <a
                href={`https://socionicsinsight.com/relations/${relInfo.siSlug}/`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.68rem', color: colours.text, opacity: 0.7, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Learn more →
              </a>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
            {relInfo.description}
          </p>
        </div>
      )}

      {/* Bio */}
      {bio && (() => {
        const long = bio.length > 200
        return (
          <div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 300 }}>
              {long && !bioExpanded ? bio.slice(0, 200) + '…' : bio}
            </p>
            {long && (
              <button
                type="button"
                onClick={() => setBioExpanded(e => !e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent)', padding: 0, marginTop: '0.25rem', letterSpacing: '0.04em' }}
              >
                {bioExpanded ? 'Read less' : 'Read more'}
              </button>
            )}
          </div>
        )
      })()}

      {/* Action */}
      <button
        type="button"
        className={alreadyMatched ? 'btn-ghost' : 'btn-primary'}
        onClick={handleAction}
        disabled={connecting}
        style={{
          opacity: connecting ? 0.5 : 1,
          cursor: connecting ? 'default' : 'pointer',
          marginTop: '0.25rem',
        }}
      >
        {connecting ? 'Connecting…' : alreadyMatched ? 'Message →' : 'Connect'}
      </button>
    </div>
  )
}
