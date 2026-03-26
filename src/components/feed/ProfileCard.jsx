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
  const { profile_data, type, relation, displayRelation, purpose } = profile
  const name = profile_data?.name ?? 'Unknown'
  const age = profile_data?.age
  const gender = profile_data?.gender
  const bio = profile_data?.bio
  const flag = countryFlag(profile_data?.country)
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
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'var(--bg-secondary, #f0ede6)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.1rem', color: 'var(--muted)', fontFamily: 'var(--serif)' }}>{name ? name[0].toUpperCase() : '?'}</span>
            }
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 500, margin: 0 }}>
              {name}{age ? `, ${age}` : ''}{gender && gender !== 'Prefer not to say' ? ` · ${gender}` : ''}
            </h3>
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
        <span style={{
          fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          fontWeight: 500, color: colours.text,
          background: colours.bg, border: `1px solid ${colours.border}`,
          padding: '0.25rem 0.6rem', borderRadius: 3, flexShrink: 0,
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
