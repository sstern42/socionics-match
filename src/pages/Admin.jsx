import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { COUNTRIES } from '../data/countries'

// Gate: only profiles with role='founder' can access
const ADMIN_ROLE = 'founder'
export const FOUNDER_FEED_KEY = 'socion_founder_feed_override'
const COUNTRY_NAME = Object.fromEntries(COUNTRIES.map(c => [c.code, c.name]))

function FounderFeedToggle() {
  const [enabled, setEnabled] = React.useState(
    () => localStorage.getItem(FOUNDER_FEED_KEY) === 'true'
  )
  function toggle() {
    const next = !enabled
    localStorage.setItem(FOUNDER_FEED_KEY, String(next))
    setEnabled(next)
  }
  return (
    <div style={{ ...founderCardStyle, marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500 }}>Founder feed override</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.4rem', lineHeight: 1.5 }}>
            {enabled ? 'Active — showing all profiles regardless of purpose.' : 'Off — feed filters by your purpose as normal.'}
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggle}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: enabled ? 500 : 400 }}>
            {enabled ? 'On' : 'Off'}
          </span>
        </label>
      </div>
    </div>
  )
}

export default function Admin() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [announcementActive, setAnnouncementActive] = useState(false)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [trackingExcluded, setTrackingExcluded] = useState(() => localStorage.getItem('umami.disabled') === '1')
  const [announcementSaved, setAnnouncementSaved] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!profile) { navigate('/auth', { replace: true }); return }
    if (profile.profile_data?.role !== ADMIN_ROLE) { navigate('/', { replace: true }); return }
    // ?exclude=1 sets the Umami opt-out flag — visit this URL on any device to exclude it from analytics
    if (new URLSearchParams(window.location.search).get('exclude') === '1') {
      localStorage.setItem('umami.disabled', '1')
      window.history.replaceState(null, '', '/admin')
    }
    loadData()
  }, [loading, profile])

  async function loadData() {
    setFetching(true)
    setError(null)
    try {
      const [
        { data: users },
        { data: adminStats },
        { data: statsRow },
        { data: incompleteData },
        { data: memberEmailsData },
      ] = await Promise.all([
        supabase.from('users').select('id, type, purpose, profile_data, created_at, verified_by').order('created_at', { ascending: false }),
        supabase.rpc('get_admin_stats'),
        supabase.from('stats').select('announcement, announcement_active').eq('id', 1).single(),
        supabase.rpc('get_incomplete_signups'),
        supabase.rpc('get_member_emails'),
      ])

      setAnnouncement(statsRow?.announcement ?? '')
      setAnnouncementActive(statsRow?.announcement_active ?? false)

      // Type distribution
      const typeCounts = {}
      for (const u of users ?? []) {
        typeCounts[u.type] = (typeCounts[u.type] ?? 0) + 1
      }

      // All match/feedback data from SECURITY DEFINER RPC (bypasses RLS — truly site-wide)
      const relCounts = adminStats?.rel_counts ?? {}
      const totalMatchCount = adminStats?.total_matches ?? 0
      const feedbackCount = adminStats?.feedback_count ?? 0

      const relAvgRatings = (adminStats?.rel_ratings ?? [])
        .map(r => ({ rel: r.rel, avg: parseFloat(r.avg).toFixed(1), count: r.count }))

      const comments = (adminStats?.comments ?? [])
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))

      // Overall avg rating
      const allRatings = (adminStats?.rel_ratings ?? []).flatMap(r =>
        Array(parseInt(r.count)).fill(parseFloat(r.avg))
      )
      const avgRating = allRatings.length > 0
        ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
        : null
      const ratingsCount = (adminStats?.rel_ratings ?? []).reduce((s, r) => s + parseInt(r.count), 0)

      // Purpose breakdown
      const purposeCounts = {}
      for (const u of users ?? []) {
        for (const p of u.purpose ?? []) {
          purposeCounts[p] = (purposeCounts[p] ?? 0) + 1
        }
      }

      // Country breakdown
      const countryCounts = {}
      for (const u of users ?? []) {
        const c = u.profile_data?.country
        if (c) countryCounts[c] = (countryCounts[c] ?? 0) + 1
      }

      const reports = adminStats?.recent_blocks?.filter(b => b.type === 'block' && b.reason) ?? []

      // Daily member growth chart
      const dayCounts = {}
      for (const u of users ?? []) {
        const day = new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        dayCounts[day] = (dayCounts[day] ?? 0) + 1
      }
      // Build cumulative series sorted by date
      const sortedDays = (users ?? [])
        .map(u => new Date(u.created_at).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort((a, b) => new Date(a) - new Date(b))
      let cumulative = 0
      const growthData = sortedDays.map(d => {
        const label = new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const count = (users ?? []).filter(u => new Date(u.created_at).toDateString() === d).length
        cumulative += count
        return { label, count, total: cumulative }
      })

      const anonCount = (users ?? []).filter(u => u.profile_data?.anonymous === true).length
      const knownCount = (users ?? []).length - anonCount

      setData({
        users: users ?? [],
        totalMatchCount,
        typeCounts,
        relCounts,
        avgRating,
        ratingsCount,
        purposeCounts,
        countryCounts,
        reports,
        totalConnections: adminStats?.connections ?? 0,
        connectionsToday: adminStats?.connections_today ?? 0,
        totalMessages: adminStats?.messages ?? 0,
        messagesToday: adminStats?.messages_today ?? 0,
        totalAssessments: adminStats?.assessments ?? 0,
        totalCooloffs: adminStats?.cooloffs ?? 0,
        authUsers: adminStats?.auth_users ?? 0,
        incompleteSignups: incompleteData ?? [],
        memberEmails: memberEmailsData ?? [],
        totalReports: adminStats?.reports ?? 0,
        active7d: adminStats?.active_7d ?? 0,
        inactive: adminStats?.inactive ?? 0,
        messagingActive: adminStats?.messaging_active ?? 0,
        anonCount,
        knownCount,
        feedbackCount,
        relAvgRatings,
        comments,
        growthData,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  async function saveAnnouncement() {
    setSavingAnnouncement(true)
    await supabase.from('stats').update({ announcement, announcement_active: announcementActive }).eq('id', 1)
    setSavingAnnouncement(false)
    setAnnouncementSaved(true)
    setTimeout(() => setAnnouncementSaved(false), 2500)
  }

  if (loading || fetching) {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </section>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout noScroll hideFooter>
        <section style={centreStyle}>
          <p style={{ color: '#c0392b' }}>{error}</p>
          <button className="btn-ghost" onClick={loadData}>Retry</button>
        </section>
      </Layout>
    )
  }

  const { users, authUsers, incompleteSignups, memberEmails, totalMatchCount, typeCounts, relCounts, avgRating, ratingsCount, purposeCounts, countryCounts, reports, totalConnections, connectionsToday, totalMessages, messagesToday, totalAssessments, totalCooloffs, totalReports, feedbackCount, relAvgRatings, comments, growthData, active7d, inactive, messagingActive, anonCount, knownCount } = data

  const recentUsers = users.slice(0, 10)
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
  const sortedRels = Object.entries(relCounts).sort((a, b) => b[1] - a[1])
  const sortedPurposes = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])
  const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])

  return (
    <Layout noScroll hideFooter>
      <section style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: 'clamp(1.25rem, 4vw, 3rem) clamp(0.75rem, 3vw, 1.5rem)', boxSizing: 'border-box' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {/* Auth signups */}
          {(() => {
            const todayStr = new Date().toDateString()
            const signupsToday = (users ?? []).filter(u => new Date(u.created_at).toDateString() === todayStr).length
            return (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem 1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{authUsers}</div>
                {signupsToday > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.2rem', fontWeight: 500 }}>+{signupsToday} today</div>
                )}
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.2rem' }}>Sign-ups</div>
              </div>
            )
          })()}

          {/* Members — with today's delta */}
          {(() => {
            const todayStr = new Date().toDateString()
            const todayCount = users.filter(u => new Date(u.created_at).toDateString() === todayStr).length
            return (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem 1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{users.length}</div>
                {todayCount > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.2rem', fontWeight: 500 }}>+{todayCount} today</div>
                )}
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.2rem' }}>Members</div>
              </div>
            )
          })()}
          {[
            { value: totalConnections, label: 'Connections', delta: connectionsToday },
            { value: totalMessages, label: 'Messages', delta: messagesToday },
            { value: Object.keys(typeCounts).length, label: 'Types represented' },
            { value: totalAssessments, label: 'Assessments' },
            { value: avgRating ? `${avgRating}/5` : '—', label: `Avg rating (${ratingsCount})` },
            { value: active7d, label: 'Active 7d' },
            { value: inactive, label: 'Inactive 7d+' },
            { value: messagingActive, label: 'Messaging 7d' },
          ].map(({ value, label, delta }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem 1rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
              {delta > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.2rem', fontWeight: 500 }}>+{delta} today</div>
              )}
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: delta > 0 ? '0.2rem' : '0.4rem' }}>{label}</div>
            </div>
          ))}

          {/* Cool-offs / Reports combined */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem 1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>
              {totalCooloffs} <span style={{ color: 'var(--border)', fontWeight: 300 }}>/</span> {totalReports}
            </div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.4rem' }}>Cool-offs / Reports</div>
          </div>

          {/* Anon : Known */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem 1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>
              {anonCount} <span style={{ color: 'var(--border)', fontWeight: 300 }}>:</span> {knownCount}
            </div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.4rem' }}>Anon : Known</div>
          </div>
        </div>


        {/* Member growth chart */}
        {growthData.length > 0 && (() => {
          const visibleData = growthData.slice(-30)
          const W = 580, H = 110, padL = 28, padR = 12, padT = 18, padB = 24
          const minVal = 0
          const maxVal = visibleData[visibleData.length - 1].total
          const xStep = visibleData.length > 1 ? (W - padL - padR) / (visibleData.length - 1) : W - padL - padR
          const toX = i => padL + i * xStep
          const toY = v => padT + (H - padT - padB) * (1 - v / maxVal)
          const points = visibleData.map((d, i) => ({ x: toX(i), y: toY(d.total), ...d }))
          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
          const areaD = pathD + ` L${points[points.length-1].x.toFixed(1)},${(H-padB).toFixed(1)} L${points[0].x.toFixed(1)},${(H-padB).toFixed(1)} Z`
          // Show labels: first, last, and every ~5th
          const showLabel = i => i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length / 6)) === 0
          return (
          <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <p style={cardTitleStyle}>Member growth {growthData.length > 30 && <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>— last 30 days</span>}</p>
            <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: `${Math.max(visibleData.length * 28, 300)}px` }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path d={areaD} fill="url(#growthGrad)" />
                {/* Line */}
                <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {/* Data points + labels */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" stroke="#fff" strokeWidth="1.5" />
                    <title>{p.label}: {p.total} members</title>
                    {/* Value label above point */}
                    <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="8" fill="var(--accent)" fontWeight="500">{p.total}</text>
                    {/* Date label below */}
                    {showLabel(i) && (
                      <text x={p.x} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--muted)">{p.label}</text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Type distribution by quadra */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Type distribution</p>
            {[
              { name: 'Alpha', colour: '#BA7517', types: ['ILE', 'SEI', 'ESE', 'LII'] },
              { name: 'Beta',  colour: '#791F1F', types: ['EIE', 'LSI', 'SLE', 'IEI'] },
              { name: 'Gamma', colour: '#0F6E56', types: ['SEE', 'ILI', 'LIE', 'ESI'] },
              { name: 'Delta', colour: '#185FA5', types: ['LSE', 'EII', 'IEE', 'SLI'] },
            ].map(({ name, colour, types }) => (
              <div key={name} style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: colour, fontWeight: 500, marginBottom: '0.4rem' }}>{name}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {types.map(type => {
                    const count = typeCounts[type] ?? 0
                    return (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 500, color: count > 0 ? colour : 'var(--border)', width: 36, flexShrink: 0 }}>{type}</span>
                        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${users.length > 0 ? (count / users.length) * 100 : 0}%`, background: colour, borderRadius: 2, opacity: count > 0 ? 1 : 0 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: count > 0 ? 'var(--muted)' : 'var(--border)', width: 20, textAlign: 'right' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Relation breakdown */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Connections by relation</p>
            {[
              {
                name: 'Symmetric',
                relations: ['DUAL','ACTIVITY','MIRROR','IDENTITY','KINDRED','SEMI_DUAL','BUSINESS','QUASI_IDENTITY','CONFLICT','SUPER_EGO','CONTRARY','ILLUSIONARY'],
              },
              {
                name: 'Asymmetric',
                relations: ['SUPERVISOR','SUPERVISEE','BENEFACTOR','BENEFICIARY'],
              },
            ].map(({ name, relations }) => (
              <div key={name} style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.4rem' }}>{name}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {relations.map(rel => {
                    const count = relCounts[rel] ?? 0
                    return (
                      <div key={rel} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', color: count > 0 ? 'var(--muted)' : 'var(--border)', width: 100, flexShrink: 0, textTransform: 'capitalize' }}>
                          {rel.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${totalMatchCount > 0 ? (count / totalMatchCount) * 100 : 0}%`, background: 'var(--accent-lt)', borderRadius: 2, opacity: count > 0 ? 1 : 0 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: count > 0 ? 'var(--muted)' : 'var(--border)', width: 20, textAlign: 'right' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Purpose breakdown — pie chart */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Purpose breakdown</p>
            {(() => {
              const total = sortedPurposes.reduce((s, [, c]) => s + c, 0)
              const colours = { dating: '#BA7517', friendship: '#0F6E56', networking: '#185FA5', team: '#791F1F' }
              const COLOURS = ['#BA7517', '#0F6E56', '#185FA5', '#791F1F']
              let cumAngle = -Math.PI / 2
              const slices = sortedPurposes.map(([p, c], i) => {
                const frac = total ? c / total : 0
                const start = cumAngle
                cumAngle += frac * 2 * Math.PI
                return { p, c, frac, start, end: cumAngle, colour: colours[p] ?? COLOURS[i % COLOURS.length] }
              })
              const arc = (cx, cy, r, start, end) => {
                if (end - start >= 2 * Math.PI - 0.001) {
                  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
                }
                const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
                const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
                const large = end - start > Math.PI ? 1 : 0
                return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
              }
              return (
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginTop: '1rem' }}>
                  <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
                    {slices.map(s => (
                      <path key={s.p} d={arc(45, 45, 42, s.start, s.end)} fill={s.colour} />
                    ))}
                    <circle cx="45" cy="45" r="22" fill="var(--bg, #FAF9F6)" />
                    <text x="45" y="49" textAnchor="middle" fontSize="13" fontWeight="500" fill="var(--text, #333)">{total}</text>
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
                    {slices.map(s => (
                      <div key={s.p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.colour, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text)', textTransform: 'capitalize' }}>{s.p}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{s.c} <span style={{ color: 'var(--accent)', fontWeight: 500 }}>({Math.round(s.frac * 100)}%)</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Country breakdown — scrollable */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Members by country</p>
            <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: '1rem', paddingRight: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sortedCountries.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No country data yet.</p>
              ) : sortedCountries.map(([country, count]) => (
                <div key={country} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{COUNTRY_NAME[country] ?? country}</span>
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

        {/* Feedback analysis */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={cardStyle}>
            <p style={cardTitleStyle}>
              Ratings by relation type
              <span style={{ color: 'var(--muted)', fontWeight: 300, marginLeft: '0.5rem' }}>
                — {feedbackCount} of {totalMatchCount} site-wide connections rated
              </span>
            </p>
            {relAvgRatings.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '1rem' }}>No feedback yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {relAvgRatings.map(({ rel, avg, count }) => (
                  <div key={rel} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', width: 100, flexShrink: 0, textTransform: 'capitalize' }}>
                      {rel.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${(avg / 5) * 100}%`, background: 'var(--accent)', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500, width: 28, textAlign: 'right' }}>{avg}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', width: 24 }}>×{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <p style={cardTitleStyle}>Comments {comments.length === 0 && <span style={{ color: 'var(--muted)', fontWeight: 300 }}>— none yet</span>}</p>
            {comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', maxHeight: 280, overflowY: 'auto' }}>
                {comments.map((c, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', borderLeft: '2px solid var(--accent-lt)', paddingLeft: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500 }}>
                        {c.rel.replace(/_/g, ' ').toLowerCase()}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</span>
                    </div>
                    <p style={{ color: 'var(--text)', lineHeight: 1.5 }}>{c.comment}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.68rem', marginTop: '0.2rem' }}>
                      {new Date(c.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Founder feed override */}
        <FounderFeedToggle />

        {/* Analytics exclusion */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p style={cardTitleStyle}>Analytics exclusion</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
              {trackingExcluded
                ? 'This device is excluded from Umami analytics.'
                : 'Exclude this device from Umami analytics tracking.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem', flexShrink: 0 }}
            onClick={() => {
              if (trackingExcluded) {
                localStorage.removeItem('umami.disabled')
                setTrackingExcluded(false)
              } else {
                localStorage.setItem('umami.disabled', '1')
                setTrackingExcluded(true)
              }
            }}
          >
            {trackingExcluded ? '✓ Excluded — re-enable?' : 'Exclude this device'}
          </button>
        </div>

        {/* Announcement editor */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <p style={cardTitleStyle}>Feed announcement</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.4rem', marginBottom: '1rem' }}>
            Shown as a dismissible banner on the feed. Each unique message shows once per user.
          </p>
          <textarea
            value={announcement}
            onChange={e => { setAnnouncement(e.target.value); setAnnouncementSaved(false) }}
            rows={3}
            style={{ width: '100%', fontFamily: 'var(--sans)', fontSize: '0.88rem', lineHeight: 1.6, padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg)' }}
            placeholder="e.g. I'm Spencer, the founder. Connect with me on the feed for feedback or just to chat about Socionics."
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={announcementActive}
                onChange={e => setAnnouncementActive(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              Active (visible on feed)
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={saveAnnouncement}
              disabled={savingAnnouncement}
              style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', opacity: savingAnnouncement ? 0.5 : 1 }}
            >
              {savingAnnouncement ? 'Saving…' : announcementSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Incomplete signups — authed but no profile */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={cardTitleStyle}>
                Incomplete sign-ups
                <span style={{ fontWeight: 300, color: 'var(--muted)', marginLeft: '0.5rem' }}>— last 7 days</span>
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                Authenticated but never completed onboarding.
              </p>
            </div>
            {incompleteSignups.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => {
                    const emails = incompleteSignups.map(u => u.email).join('\n')
                    navigator.clipboard.writeText(emails)
                  }}
                >
                  Copy emails
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => {
                    const csv = 'email,signed_up\n' + incompleteSignups.map(u =>
                      `${u.email},${new Date(u.created_at).toISOString().split('T')[0]}`
                    ).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `socion-incomplete-signups-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                  }}
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>
          {incompleteSignups.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '1rem' }}>None in the last 7 days.</p>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {incompleteSignups.map((u, i) => (
                <div key={u.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.55rem 0',
                  borderBottom: i < incompleteSignups.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{u.email}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0, marginLeft: '1rem' }}>
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(u.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Member emails export */}
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={cardTitleStyle}>
                Member emails
                <span style={{ fontWeight: 300, color: 'var(--muted)', marginLeft: '0.5rem' }}>— {memberEmails.length} completed profiles</span>
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                All users who completed onboarding.
              </p>
            </div>
            {memberEmails.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => {
                    const emails = memberEmails.map(u => u.email).join('\n')
                    navigator.clipboard.writeText(emails)
                  }}
                >
                  Copy emails
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => {
                    const csv = 'email,name,type,joined\n' + memberEmails.map(u =>
                      `${u.email},${u.name ?? ''},${u.type},${new Date(u.created_at).toISOString().split('T')[0]}`
                    ).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `socion-members-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                  }}
                >
                  Export CSV
                </button>
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
                    {u.profile_data?.gender && u.profile_data.gender !== 'Prefer not to say' ? ` ${{ Man: '👨', Woman: '👩', 'Non-binary': '🧑' }[u.profile_data.gender] ?? ''}` : ''}
                  </span>
                  {u.profile_data?.dob && (() => {
                    const dob = new Date(u.profile_data.dob)
                    const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000))
                    return <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{age}y</span>
                  })()}
                  {u.profile_data?.country && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{u.profile_data.country}</span>
                  )}
                  {u.profile_data?.anonymous === true && (
                    <span style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 2, padding: '0.1rem 0.35rem' }}>Anon</span>
                  )}
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {(u.purpose ?? []).map(p => (
                      <span key={p} style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 2, padding: '0.1rem 0.35rem' }}>{p}</span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(u.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Verification */}
        <VerificationPanel users={users} onUpdate={loadData} />

      </section>
    </Layout>
  )
}

}

function VerificationPanel({ users, onUpdate }) {
  const [verifying, setVerifying] = useState(null) // user id being updated
  const [verifierName, setVerifierName] = useState('Spencer')
  const [search, setSearch] = useState('')

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || (u.profile_data?.name ?? '').toLowerCase().includes(q) || u.type.toLowerCase().includes(q)
  })

  async function grant(userId) {
    setVerifying(userId)
    try {
      const { error } = await supabase.from('users').update({ verified_by: verifierName.trim() || 'Spencer' }).eq('id', userId)
      if (error) throw error
      await onUpdate()
    } catch (err) {
      console.error('Verify failed:', err)
    } finally {
      setVerifying(null)
    }
  }

  async function revoke(userId) {
    setVerifying(userId)
    try {
      const { error } = await supabase.from('users').update({ verified_by: null }).eq('id', userId)
      if (error) throw error
      await onUpdate()
    } catch (err) {
      console.error('Revoke failed:', err)
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div style={cardStyle}>
      <p style={cardTitleStyle}>Type verification</p>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or type…"
          style={{ flex: 1, minWidth: 160, padding: '0.4rem 0.75rem', fontSize: '0.82rem', border: '1px solid var(--border)', borderRadius: 3, fontFamily: 'var(--sans)', outline: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Verified by</span>
          <input
            value={verifierName}
            onChange={e => setVerifierName(e.target.value)}
            style={{ width: 100, padding: '0.4rem 0.6rem', fontSize: '0.82rem', border: '1px solid var(--border)', borderRadius: 3, fontFamily: 'var(--sans)', outline: 'none' }}
          />
        </div>
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {filtered.map((u, i) => (
          <div key={u.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.55rem 0',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--accent)', width: 36, flexShrink: 0 }}>{u.type}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.profile_data?.name ?? '—'}
              </span>
              {u.verified_by && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.45rem', fontWeight: 700, lineHeight: 1 }}>✓</span>
                  {u.verified_by}
                </span>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              {u.verified_by ? (
                <button
                  type="button"
                  onClick={() => revoke(u.id)}
                  disabled={verifying === u.id}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '0.25rem 0.6rem', fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer', opacity: verifying === u.id ? 0.5 : 1 }}
                >
                  {verifying === u.id ? '…' : 'Revoke'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => grant(u.id)}
                  disabled={verifying === u.id}
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: 3, padding: '0.25rem 0.6rem', fontSize: '0.72rem', color: '#fff', cursor: 'pointer', opacity: verifying === u.id ? 0.5 : 1 }}
                >
                  {verifying === u.id ? '…' : 'Verify'}
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', padding: '0.75rem 0' }}>No members match.</p>
        )}
      </div>
    </div>
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

const founderCardStyle = {
  background: 'rgba(154,111,56,0.04)',
  border: '1px solid var(--accent-lt)',
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
