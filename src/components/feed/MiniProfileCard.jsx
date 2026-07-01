import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getQuadra } from '../../data/relations'
import { countryFlag } from '../../data/countries'
import { getProfileViewCount } from '../../lib/profileViews'
import FlagImage from '../FlagImage'

const QUADRA_COLOURS = { Alpha: '#BA7517', Beta: '#791F1F', Gamma: '#0F6E56', Delta: '#185FA5' }

function quadraColours(type) {
  const quadra = getQuadra(type)
  const hex = quadra ? QUADRA_COLOURS[quadra] : null
  if (!hex) return { text: 'var(--muted)', border: 'var(--border)', bg: 'rgba(100,100,100,0.05)' }
  return { text: hex, border: `${hex}88`, bg: `${hex}12`, hex }
}

function StatRow({ label, value, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0',
        fontSize: '0.8rem', width: '100%', background: 'none', border: 'none',
        cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
      }}
    >
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{value}</span>
    </Tag>
  )
}

function QuickLink({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
        padding: '0.55rem 0', fontSize: '0.8rem', color: 'var(--text)',
        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ width: 16, textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>{icon}</span>
      {label}
    </button>
  )
}

export default function MiniProfileCard({ profile, isPremium, connectionCount, savedCount, previewOpen, onTogglePreview }) {
  const navigate = useNavigate()
  const { profile_data, type, verified_by, is_founding_member, plan_status } = profile
  const name = profile_data?.name ?? 'Unknown'
  const role = profile_data?.role
  const bio = profile_data?.bio
  const flag = countryFlag(profile_data?.country)
  const genderEmoji = { Man: '👨', Woman: '👩', 'Non-binary': '🧑' }[profile_data?.gender]
  const colours = quadraColours(type)

  const { data: viewCount } = useQuery({
    queryKey: ['profile-views-count', profile.id],
    queryFn: () => getProfileViewCount(profile.id),
    staleTime: 5 * 60_000,
    enabled: !!profile.id,
  })

  const memberBadge = is_founding_member
    ? <span title="Founding member" style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.25rem' }}>✦</span>
    : (plan_status === 'active' || plan_status === 'past_due')
      ? <span title="Premium subscriber" style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.25rem' }}>★</span>
      : null

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ height: 52, background: `linear-gradient(120deg, ${colours.hex ?? 'var(--accent)'} 0%, color-mix(in srgb, ${colours.hex ?? 'var(--accent)'} 70%, #000) 100%)` }} />

      <div style={{ position: 'relative', padding: '0 1rem 0.9rem' }}>
        <div style={{
          position: 'absolute', top: -28, left: '1rem', width: 56, height: 56, borderRadius: '50%',
          background: 'var(--surface)', border: '3px solid var(--card-bg)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--muted)' }}>{name ? name[0].toUpperCase() : '?'}</span>
          }
        </div>

        <div style={{ paddingTop: '2.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', fontWeight: 500, margin: 0 }}>
            {name}{genderEmoji ? ` ${genderEmoji}` : ''}{memberBadge}
          </h3>
          <span style={{
            fontSize: '0.62rem', letterSpacing: '0.06em', fontWeight: 600, color: colours.text,
            background: colours.bg, border: `1px solid ${colours.border}`, borderRadius: 3,
            padding: '0.15rem 0.4rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          }}>
            {type}
            {verified_by && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10, borderRadius: '50%', background: colours.text, color: '#fff', fontSize: '0.4rem', fontWeight: 700 }}>✓</span>}
          </span>
        </div>

        {role && (
          <span style={{
            display: 'inline-block', marginTop: '0.35rem', fontSize: '0.58rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600, color: '#fff',
            background: role === 'founder' ? '#2c2a22' : role === 'typist' ? '#185FA5' : 'var(--accent)',
            padding: '0.15rem 0.5rem', borderRadius: 2,
          }}>{role}</span>
        )}

        {bio && (
          <p style={{
            fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{bio}</p>
        )}

        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {flag && <FlagImage code={flag} />}{profile_data?.city}
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '0.5rem 1rem' }}>
        <StatRow label="Profile viewers" value={viewCount ?? '—'} onClick={() => navigate(`/profile/${profile.id}?tab=views`)} />
        <StatRow label="Connections" value={isPremium ? connectionCount : `${connectionCount} of 3`} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '0.35rem 1rem' }}>
        <QuickLink icon="🔖" label={`Saved profiles${savedCount ? ` (${savedCount})` : ''}`} onClick={() => navigate('/saved')} />
        <QuickLink icon="💬" label="Your matches" onClick={() => navigate('/messages')} />
        <QuickLink icon="🏠" label="Rooms" onClick={() => navigate('/rooms')} />
        <QuickLink icon="📋" label="Boards" onClick={() => navigate('/boards')} />
        <QuickLink icon="👁" label={previewOpen ? 'Hide card preview' : 'Preview your card'} onClick={onTogglePreview} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigate('/profile/edit')}
          style={{ width: '100%', padding: '0.55rem', fontSize: '0.75rem' }}
        >
          Edit profile →
        </button>
      </div>
    </div>
  )
}
