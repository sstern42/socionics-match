import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

// Gate: only profiles with role='founder' can access
const ADMIN_ROLE = 'founder'

export default function Admin() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (loading) return
    if (!profile) { navigate('/auth', { replace: true }); return }
    if (profile.profile_data?.role !== ADMIN_ROLE) { navigate('/', { replace: true }); return }
    loadData()
  }, [loading, profile])

  async function loadData() {
    setFetching(true)
    setError(null)
    try {
      const [
        { data: users },
        { data: adminStats },
        { data: matches },
      ] = await Promise.all([
        supabase.from('users').select('id, type, purpose, profile_data, created_at').order('created_at', { ascending: false }),
        supabase.rpc('get_admin_stats'),
        supabase.from('matches').select('id, relation_type, purpose, created_at, feedback_a, feedback_b').order('created_at', { ascending: false }),
      ])

      // Type distribution
      const typeCounts = {}
      for (const u of users ?? []) {
        typeCounts[u.type] = (typeCounts[u.type] ?? 0) + 1
      }

      // Relation type breakdown
      const relCounts = {}
      for (const m of matches ?? []) {
        relCounts[m.relation_type] = (relCounts[m.relation_type] ?? 0) + 1
      }

      // Feedback ratings
      const ratings = []
      for (const m of matches ?? []) {
        if (m.feedback_a?.rating) ratings.push(m.feedback_a.rating)
        if (m.feedback_b?.rating) ratings.push(m.feedback_b.rating)
      }
      const avgRating = ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null

      // Purpose breakdown
      const purposeCounts = {}
      for (const u of users ?? []) {
        for (const p of u.purpose ?? []) {
          purposeCounts[p] = (purposeCounts[p] ?? 0) + 1
        }
      }

      const reports = adminStats?.recent_blocks?.filter(b => b.type === 'block' && b.reason) ?? []

      setData({
        users: users ?? [],
        matches: matches ?? [],
        typeCounts,
        relCounts,
        avgRating,
        ratings,
        purposeCounts,
        reports,
        totalConnections: adminStats?.connections ?? 0,
        totalMessages: adminStats?.messages ?? 0,
        totalAssessments: adminStats?.assessments ?? 0,
        totalCooloffs: adminStats?.cooloffs ?? 0,
        totalReports: adminStats?.reports ?? 0,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  if (loading || fetching) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </section>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p style={{ color: '#c0392b' }}>{error}</p>
          <button className="btn-ghost" onClick={loadData}>Retry</button>
        </section>
      </Layout>
    )
  }

  const { users, matches, typeCounts, relCounts, avgRating, ratings, purposeCounts, reports, totalConnections, totalMessages, totalAssessments, totalCooloffs, totalReports } = data

  const recentUsers = users.slice(0, 10)
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
  const sortedRels = Object.entries(relCounts).sort((a, b) => b[1] - a[1])
  const sortedPurposes = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])

  return (
    <Layout>
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p className="eyebrow">Admin</p>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,4vw,3rem)', marginTop: '0.4rem' }}>
              Dashboard
            </h1>
          </div>
          <button type="button" className="btn-ghost" onClick={loadData} style={{ padding: '0.5rem 1rem', fontSize: '0.78rem' }}>
            Refresh
          </button>
        </div>

        {/* Headline stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { value: users.length, label: 'Members' },
            { value: totalConnections, label: 'Connections' },
            { value: totalMessages, label: 'Messages' },
            { value: Object.keys(typeCounts).length, label: 'Types represented' },
            { value: totalAssessments, label: 'Assessments' },
            { value: avgRating ? `${avgRating}/5` : '—', label: `Avg rating (${ratings.length})` },
            { value: totalCooloffs, label: 'Cool-offs' },
            { value: totalReports, label: 'Reports' },
          ].map(({ value, label }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem 1rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.4rem' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Type distribution */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Type distribution</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {sortedTypes.map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--accent)', width: 36, flexShrink: 0 }}>{type}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(count / users.length) * 100}%`, background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', width: 20, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Relation breakdown */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Connections by relation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {sortedRels.map(([rel, count]) => (
                <div key={rel} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', width: 100, flexShrink: 0, textTransform: 'capitalize' }}>
                    {rel.replace('_', ' ').toLowerCase()}
                  </span>
                  <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(count / matches.length) * 100}%`, background: 'var(--accent-lt)', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', width: 20, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Purpose breakdown */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Purpose breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {sortedPurposes.map(([purpose, count]) => (
                <div key={purpose} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)', textTransform: 'capitalize' }}>{purpose}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 500 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reports */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Reports {reports.length === 0 && <span style={{ color: 'var(--muted)', fontWeight: 300 }}>— none</span>}</p>
            {reports.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {reports.map(r => (
                  <div key={r.id} style={{ fontSize: '0.78rem', borderLeft: '2px solid #c0392b', paddingLeft: '0.75rem' }}>
                    <p style={{ color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.68rem' }}>{r.reason}</p>
                    <p style={{ color: 'var(--muted)', marginTop: '0.15rem' }}>
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent signups */}
        <div style={cardStyle}>
          <p style={cardTitleStyle}>Recent signups</p>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentUsers.map((u, i) => (
              <div key={u.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0',
                borderBottom: i < recentUsers.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--accent)', width: 36 }}>{u.type}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                    {u.profile_data?.name ?? '—'}
                    {u.profile_data?.age ? `, ${u.profile_data.age}` : ''}
                    {u.profile_data?.gender && u.profile_data.gender !== 'Prefer not to say' ? ` · ${u.profile_data.gender}` : ''}
                  </span>
                  {u.profile_data?.country && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{u.profile_data.country}</span>
                  )}
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {(u.purpose ?? []).map(p => (
                      <span key={p} style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 2, padding: '0.1rem 0.35rem' }}>{p}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: '1.5rem', padding: '2rem',
}

const cardStyle = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1.25rem',
}

const cardTitleStyle = {
  fontSize: '0.72rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  fontWeight: 500,
}
