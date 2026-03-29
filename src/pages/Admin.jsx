import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

// Gate: only profiles with role='founder' can access
const ADMIN_ROLE = 'founder'
export const FOUNDER_FEED_KEY = 'socion_founder_feed_override'

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
  const [announcementSaved, setAnnouncementSaved] = useState(false)

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
        { data: statsRow },
      ] = await Promise.all([
        supabase.from('users').select('id, type, purpose, profile_data, created_at').order('created_at', { ascending: false }),
        supabase.rpc('get_admin_stats'),
        supabase.from('stats').select('announcement, announcement_active').eq('id', 1).single(),
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
        totalMessages: adminStats?.messages ?? 0,
        totalAssessments: adminStats?.assessments ?? 0,
        totalCooloffs: adminStats?.cooloffs ?? 0,
        totalReports: adminStats?.reports ?? 0,
        active7d: adminStats?.active_7d ?? 0,
        inactive: adminStats?.inactive ?? 0,
        messagingActive: adminStats?.messaging_active ?? 0,
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
      <Layout hideFooter>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </section>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout hideFooter>
        <section style={centreStyle}>
          <p style={{ color: '#c0392b' }}>{error}</p>
          <button className="btn-ghost" onClick={loadData}>Retry</button>
        </section>
      </Layout>
    )
  }

  const { users, totalMatchCount, typeCounts, relCounts, avgRating, ratingsCount, purposeCounts, countryCounts, reports, totalConnections, totalMessages, totalAssessments, totalCooloffs, totalReports, feedbackCount, relAvgRatings, comments, growthData, active7d, inactive, messagingActive } = data

  const recentUsers = users.slice(0, 10)
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
  const sortedRels = Object.entries(relCounts).sort((a, b) => b[1] - a[1])
  const sortedPurposes = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])
  const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])

  return (
    <Layout hideFooter>
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
            { value: totalConnections, label: 'Connections' },
            { value: totalMessages, label: 'Messages' },
            { value: Object.keys(typeCounts).length, label: 'Types represented' },
            { value: totalAssessments, label: 'Assessments' },
            { value: avgRating ? `${avgRating}/5` : '—', label: `Avg rating (${ratingsCount})` },
            { value: totalCooloffs, label: 'Cool-offs' },
            { value: totalReports, label: 'Reports' },
            { value: active7d, label: 'Active 7d' },
            { value: inactive, label: 'Inactive 7d+' },
            { value: messagingActive, label: 'Messaging 7d' },
          ].map(({ value, label }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem 1rem', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.4rem' }}>{label}</div>
            </div>
          ))}
        </div>


        {/* Member growth chart */}
        {growthData.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
            <p style={cardTitleStyle}>Member growth</p>
            <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'flex-end', gap: '6px', height: 80 }}>
              {growthData.map(({ label, total }, i) => {
                const max = growthData[growthData.length - 1].total
                const barH = Math.max(4, Math.round((total / max) * 80))
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 500 }}>{total}</span>
                    <div
                      title={`${label}: ${total} members`}
                      style={{ width: '100%', height: barH, background: i === growthData.length - 1 ? 'var(--accent)' : 'var(--accent-lt)', borderRadius: '2px 2px 0 0' }}
                    />
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

          {/* Country breakdown */}
          <div style={cardStyle}>
            <p style={cardTitleStyle}>Members by country</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {sortedCountries.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No country data yet.</p>
              ) : sortedCountries.map(([country, count]) => (
                <div key={country} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{country}</span>
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
