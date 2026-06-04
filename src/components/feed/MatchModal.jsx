import { useNavigate } from 'react-router-dom'
import { RELATIONS } from '../../data/relations'
import { countryFlag } from '../../data/countries'

function Avatar({ profile, size = 72 }) {
  const isAnon  = profile?.profile_data?.anonymous ?? false
  const initial = isAnon ? '🕵️' : (profile?.profile_data?.name?.[0]?.toUpperCase() ?? '?')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '3px solid var(--card-bg)',
      background: 'var(--surface)',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {profile?.avatar_url && !isAnon
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontFamily: 'var(--serif)', fontSize: size * 0.38, color: 'var(--accent-lt)', lineHeight: 1 }}>{initial}</span>
      }
    </div>
  )
}

const RELATION_COLOURS = {
  DUAL:      { bg: 'rgba(154,111,56,0.10)', border: 'var(--accent)',    text: 'var(--accent)' },
  ACTIVITY:  { bg: 'rgba(154,111,56,0.07)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  MIRROR:    { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  SEMI_DUAL: { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
}
const NEUTRAL = { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' }

export default function MatchModal({ matchData, currentProfile, onDismiss }) {
  const navigate = useNavigate()
  if (!matchData) return null

  const { profile, relationType, matchId } = matchData
  const relInfo  = RELATIONS[relationType]
  const colours  = RELATION_COLOURS[relationType] ?? NEUTRAL
  const isAnon   = profile.profile_data?.anonymous ?? false
  const name     = isAnon ? 'Anonymous' : (profile.profile_data?.name ?? profile.type)
  const flag     = isAnon ? null : countryFlag(profile.profile_data?.country)

  function handleMessage() {
    onDismiss()
    if (matchId) navigate(`/messages?match=${matchId}`)
    else navigate('/messages')
    window.umami?.track('match-modal-message-clicked', { relationType })
  }

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg)', borderRadius: 12, padding: '2rem 1.75rem',
          width: '100%', maxWidth: 380,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', height: 80 }}>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(calc(-50% - 28px)', zIndex: 2 }}>
            <Avatar profile={currentProfile} size={72} />
          </div>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(calc(-50% + 28px))', zIndex: 1 }}>
            <Avatar profile={profile} size={72} />
          </div>
        </div>

        <div>
          <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>It's a match</p>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', fontWeight: 500, margin: 0 }}>
            You and <em>{name}</em>
          </h2>
          {flag && (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{flag}</p>
          )}
        </div>

        {relInfo && (
          <div style={{
            width: '100%', background: colours.bg,
            border: `1px solid ${colours.border}`,
            borderRadius: 6, padding: '0.65rem 1rem',
          }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: colours.text, fontWeight: 500, margin: 0 }}>
              {relInfo.name}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5, margin: '0.2rem 0 0' }}>
              {relInfo.description}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
          <button type="button" className="btn-primary" onClick={handleMessage} style={{ width: '100%' }}>
            Send first message →
          </button>
          <button type="button" className="btn-ghost" onClick={onDismiss} style={{ width: '100%' }}>
            Keep swiping
          </button>
        </div>
      </div>
    </div>
  )
}
