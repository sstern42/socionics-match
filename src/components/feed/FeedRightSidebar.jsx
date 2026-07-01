import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ENTRIES as CHANGELOG_ENTRIES } from '../../pages/Changelog'

function Card({ title, children }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.1rem', marginBottom: '1rem' }}>
      <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>{title}</p>
      {children}
    </div>
  )
}

function CardLink({ to, children }) {
  return (
    <Link to={to} style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.76rem', color: 'var(--accent)', textDecoration: 'underline' }}>
      {children}
    </Link>
  )
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{value ?? '—'}</span>
    </div>
  )
}

function UpdatesCard() {
  const latest = CHANGELOG_ENTRIES[0]
  if (!latest) return null
  return (
    <Card title="Site updates">
      <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>{latest.date}</p>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {latest.items.slice(0, 3).map((item, i) => (
          <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5 }}>{item}</li>
        ))}
      </ul>
      <CardLink to="/changelog">See full changelog →</CardLink>
    </Card>
  )
}

function StatsCard() {
  const { data } = useQuery({
    queryKey: ['public-stats-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_stats')
      if (error) throw error
      return data
    },
    staleTime: 15 * 60_000,
  })

  if (!data) return null

  return (
    <Card title="Live stats">
      <StatRow label="Members" value={data.total_members} />
      <StatRow label="Connections made" value={data.total_connections} />
      <StatRow label="Ratings submitted" value={data.total_ratings} />
      <CardLink to="/stats">See full stats →</CardLink>
    </Card>
  )
}

function PremiumCard() {
  return (
    <Card title="Go further">
      <p style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '0.85rem' }}>
        See who viewed you, unlock every relation type, and filter your feed to your strongest matches.
      </p>
      <Link to="/premium" className="btn-primary" style={{ display: 'block', textAlign: 'center', padding: '0.55rem', fontSize: '0.78rem' }}>
        Upgrade to Premium ✦
      </Link>
    </Card>
  )
}

export default function FeedRightSidebar({ isPremium }) {
  return (
    <>
      <UpdatesCard />
      <StatsCard />
      {!isPremium && <PremiumCard />}
    </>
  )
}
