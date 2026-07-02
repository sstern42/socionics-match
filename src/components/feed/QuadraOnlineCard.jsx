import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getQuadra, QUADRA_COLOURS } from '../../data/relations'
import { getQuadraOnline } from '../../lib/feed'

const FIFTEEN_MIN = 15 * 60_000
const ONE_DAY = 24 * 60 * 60_000

function isOnlineNow(member) {
  return !!member.last_active && Date.now() - new Date(member.last_active).getTime() < FIFTEEN_MIN
}
function isActiveToday(member) {
  return !!member.last_active && Date.now() - new Date(member.last_active).getTime() < ONE_DAY
}

export default function QuadraOnlineCard({ profile }) {
  const navigate = useNavigate()
  const quadra = getQuadra(profile?.type)
  const colour = quadra ? QUADRA_COLOURS[quadra] : 'var(--accent)'

  const { data: members } = useQuery({
    queryKey: ['quadra-online', profile?.type, profile?.id],
    queryFn: () => getQuadraOnline({ userType: profile.type, currentUserId: profile.id }),
    enabled: !!profile?.type && !!profile?.id,
    staleTime: 2 * 60_000,
  })

  if (!quadra || !members) return null

  const visible = members.filter(m => !m.profile_data?.hide_activity)
  const onlineNow = visible.filter(isOnlineNow)
  const activeToday = visible.filter(m => isActiveToday(m) && !isOnlineNow(m))
  const ranked = [...onlineNow, ...activeToday]
  const shown = ranked.slice(0, 2)
  const moreCount = ranked.length - shown.length

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1.1rem', marginTop: '0.75rem' }}>
      <p className="eyebrow" style={{ marginBottom: '0.65rem', color: colour, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>{quadra} quadra</span>
        {ranked.length > 0 && (
          <span style={{ fontSize: '0.68rem', letterSpacing: 'normal', textTransform: 'none', color: 'var(--muted)' }}>
            {onlineNow.length > 0 ? `${onlineNow.length} online` : `${activeToday.length} active today`}
          </span>
        )}
      </p>

      {shown.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          No one from your quadra is online right now.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {shown.map(member => {
            const isAnon = member.profile_data?.anonymous === true
            const name = isAnon ? 'Anonymous' : (member.profile_data?.name ?? 'Member')
            const avatar = isAnon ? null : member.avatar_url
            const online = isOnlineNow(member)
            const Tag = isAnon ? 'div' : 'button'
            return (
              <Tag
                key={member.id}
                {...(isAnon ? {} : { type: 'button', onClick: () => navigate(`/profile/${member.id}`) })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%',
                  background: 'none', border: 'none', cursor: isAnon ? 'default' : 'pointer', padding: 0, textAlign: 'left',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--serif)', position: 'relative',
                }}>
                  {avatar
                    ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (isAnon ? '🕵️' : name[0].toUpperCase())}
                  <span style={{
                    position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%',
                    background: online ? '#4caf50' : '#f5a623', border: '2px solid var(--card-bg)',
                  }} />
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: 'auto', flexShrink: 0 }}>{member.type}</span>
              </Tag>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/rooms')}
        style={{ display: 'inline-block', marginTop: '0.7rem', fontSize: '0.76rem', color: 'var(--accent)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {moreCount > 0 ? `See ${moreCount} more in your quadra room →` : 'Chat in your quadra room →'}
      </button>
    </div>
  )
}
