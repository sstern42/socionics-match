import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'

const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','IEE','SLI']

const TYPE_QUADRA = {
  ILE:'alpha', SEI:'alpha', ESE:'alpha', LII:'alpha',
  SLE:'beta',  IEI:'beta',  EIE:'beta',  LSI:'beta',
  SEE:'gamma', ILI:'gamma', LIE:'gamma', ESI:'gamma',
  LSE:'delta', EII:'delta', IEE:'delta', SLI:'delta',
}
const QUADRA_COLOURS = {
  alpha: '#2E8FBE',
  beta:  '#BA7517',
  gamma: '#0F6E56',
  delta: '#185FA5',
}

const REL_ORDER = [
  'DUAL','ACTIVITY','MIRROR','SEMI_DUAL','KINDRED','BUSINESS',
  'IDENTITY','QUASI_IDENTITY','ILLUSIONARY','CONTRARY',
  'SUPERVISOR','SUPERVISEE','BENEFACTOR','BENEFICIARY',
  'SUPER_EGO','CONFLICT',
]

function relLabel(rel) {
  return rel.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1)  return 'today'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export default function Stats() {
  usePageMeta('Stats', 'Live Socionics compatibility data from the Socion community — satisfaction ratings by relation type, most-connected dynamics, type distribution, and member feedback.')
  const { session } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.rpc('get_public_stats').then(({ data, error }) => {
      if (error) { setError(error.message); setLoading(false); return }
      setStats(data)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <Layout hideFooter>
      <section style={centreStyle}>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Loading…</p>
      </section>
    </Layout>
  )

  if (error) return (
    <Layout hideFooter>
      <section style={centreStyle}>
        <p style={{ color: '#c0392b', fontSize: '0.88rem' }}>{error}</p>
      </section>
    </Layout>
  )

  const {
    total_members,
    total_connections,
    total_ratings,
    type_counts = {},
    rel_counts  = {},
    rel_ratings = [],
    recent_comments = [],
  } = stats

  // Relation ratings sorted best → worst
  const sortedRatings = [...(rel_ratings ?? [])].sort((a, b) => b.avg - a.avg)

  // Relation counts sorted highest → lowest
  const totalConns = Object.values(rel_counts).reduce((s, v) => s + v, 0)
  const sortedRels = REL_ORDER
    .map(rel => ({ rel, count: rel_counts[rel] ?? 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)

  // Type counts
  const totalMembers = parseInt(total_members) || 0
  const sortedTypes = TYPES
    .map(type => ({ type, count: type_counts[type] ?? 0 }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <Layout hideFooter>
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>

        {/* Header */}
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          Does the theory hold?
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.7, maxWidth: 560, marginBottom: '3rem' }}>
          Socionics makes specific, falsifiable predictions about relationship quality. Here's what the data says — drawn from real connections and ratings on Socion.
        </p>

        {/* Headline numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(120px, 100%), 1fr))', gap: '1rem', marginBottom: '3rem' }}>
          {[
            { value: total_members,     label: 'Members' },
            { value: total_connections, label: 'Connections' },
            { value: total_ratings,     label: 'Ratings submitted' },
          ].map(({ value, label }) => (
            <div key={label} style={statCardStyle}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>
                {parseInt(value).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.5rem' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Relation ratings */}
        {sortedRatings.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={sectionHeadStyle}>Satisfaction by relation type</h2>
            <p style={sectionSubStyle}>
              Average rating left by members on their connections. Relations need at least 3 ratings to appear.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }}>
              {sortedRatings.map(({ rel, avg, count }) => (
                <div key={rel} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', width: 110, flexShrink: 0 }}>
                    {relLabel(rel)}
                  </span>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                    <div style={{
                      height: '100%',
                      width: `${(avg / 5) * 100}%`,
                      background: avg >= 4 ? 'var(--accent)' : avg >= 3 ? '#BA7517' : '#c0392b',
                      borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', width: 28, textAlign: 'right' }}>
                    {parseFloat(avg).toFixed(1)}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', width: 32 }}>
                    ×{count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most connected relations */}
        {sortedRels.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={sectionHeadStyle}>Most connected relation types</h2>
            <p style={sectionSubStyle}>Which relations members actually connect in — revealed preference.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
              {sortedRels.map(({ rel, count }) => (
                <div key={rel} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', width: 110, flexShrink: 0 }}>
                    {relLabel(rel)}
                  </span>
                  <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3 }}>
                    <div style={{
                      height: '100%',
                      width: `${totalConns > 0 ? (count / sortedRels[0].count) * 100 : 0}%`,
                      background: 'var(--accent-lt)',
                      borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', width: 28, textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Type distribution */}
        {sortedTypes.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={sectionHeadStyle}>Type distribution</h2>
            <p style={sectionSubStyle}>Which types are represented on Socion.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
              {['alpha','beta','gamma','delta'].map(quadra => {
                const colour = QUADRA_COLOURS[quadra]
                const quadraTypes = sortedTypes.filter(t => TYPE_QUADRA[t.type] === quadra)
                if (quadraTypes.length === 0) return null
                return (
                  <div key={quadra}>
                    <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: colour, fontWeight: 500, marginBottom: '0.5rem' }}>
                      {quadra.charAt(0).toUpperCase() + quadra.slice(1)}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {quadraTypes.map(({ type, count }) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 500, color: colour, width: 36, flexShrink: 0 }}>
                            {type}
                          </span>
                          <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3 }}>
                            <div style={{
                              height: '100%',
                              width: `${totalMembers > 0 ? (count / totalMembers) * 100 : 0}%`,
                              background: colour,
                              borderRadius: 3,
                              opacity: 0.7,
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', width: 28, textAlign: 'right' }}>
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent comments */}
        {recent_comments?.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={sectionHeadStyle}>What members say</h2>
            <p style={sectionSubStyle}>Recent written ratings, unedited.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
              {recent_comments.map((c, i) => (
                <div key={i} style={{ borderLeft: '2px solid var(--accent-lt)', paddingLeft: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500 }}>
                      {relLabel(c.rel)}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                      {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                      {timeAgo(c.submitted_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                    {c.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Every connection and rating contributes to this dataset. The more members rate their connections, the clearer the picture becomes.
          </p>
         <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!session && (
              <Link to="/auth" className="btn-primary" style={{ fontSize: '0.82rem', textDecoration: 'none', display: 'inline-block' }}>
                Join Socion
              </Link>
            )}
            <Link to="/network" style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              View the connection network →
            </Link>
          </div>
        </div>

      </section>
    </Layout>
  )
}

const centreStyle    = { minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }
const statCardStyle  = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '1.25rem', textAlign: 'center', minWidth: 0 }
const sectionHeadStyle = { fontFamily: 'var(--serif)', fontSize: '1.25rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }
const sectionSubStyle  = { fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }
