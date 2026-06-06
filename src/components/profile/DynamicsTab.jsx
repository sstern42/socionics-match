import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { RELATIONS, MATRIX } from '../../data/relations'

// Relation group colours — warm to cool
const GROUP_COLOURS = {
  DUAL:          '#2ecc71',
  ACTIVITY:      '#27ae60',
  MIRROR:        '#f39c12',
  SEMI_DUAL:     '#e67e22',
  KINDRED:       '#9a6f38',
  BUSINESS:      '#9a6f38',
  BENEFACTOR:    '#9a6f38',
  BENEFICIARY:   '#9a6f38',
  QUASI_IDENTITY:'#7f8c8d',
  ILLUSIONARY:   '#7f8c8d',
  CONTRARY:      '#7f8c8d',
  SUPERVISOR:    '#7f8c8d',
  SUPERVISEE:    '#7f8c8d',
  SUPER_EGO:     '#e74c3c',
  CONFLICT:      '#c0392b',
  IDENTITY:      '#95a5a6',
}

function avg(arr) {
  const nums = arr.filter(n => n != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function RatingBar({ value, globalAvg, colour }) {
  if (value == null) return <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>No ratings yet</span>
  const pct = (value / 5) * 100
  const globalPct = globalAvg != null ? (globalAvg / 5) * 100 : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, position: 'relative', overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: colour, borderRadius: 3, transition: 'width 0.4s ease' }} />
        {globalPct != null && (
          <div title={`Site avg: ${globalAvg?.toFixed(1)}`} style={{ position: 'absolute', top: -3, left: `${globalPct}%`, width: 2, height: 12, background: 'var(--muted)', borderRadius: 1, opacity: 0.6 }} />
        )}
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text)', flexShrink: 0, width: 26, textAlign: 'right' }}>{value.toFixed(1)}</span>
    </div>
  )
}

function SummaryCard({ label, value, sub, colour }) {
  return (
    <div style={{ flex: '1 1 140px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <p style={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500 }}>{label}</p>
      <p style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 500, color: colour ?? 'var(--accent)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{sub}</p>}
    </div>
  )
}

export default function DynamicsTab({ myType, isPremium }) {
  const [rows, setRows]           = useState([])
  const [globals, setGlobals]     = useState({})
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    if (!isPremium || !myType) return
    setLoading(true)

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        console.log('[DynamicsTab] userId:', userId, 'myType:', myType)
        if (!userId) { setLoading(false); return }

        const [{ data: userRows, error: ue }, { data: globalRows, error: ge }] = await Promise.all([
          supabase.rpc('get_user_relation_stats', { p_user_id: userId }),
          supabase.rpc('get_global_relation_averages'),
        ])

        console.log('[DynamicsTab] userRows:', userRows, 'ue:', ue)
        console.log('[DynamicsTab] globalRows:', globalRows, 'ge:', ge)

        if (ue || ge) throw ue ?? ge

        // Build global avg map
        const globalMap = {}
        for (const g of (globalRows ?? [])) {
          globalMap[g.relation_type] = { avg: parseFloat(g.avg_rating), count: parseInt(g.rated_count) }
        }
        setGlobals(globalMap)

        // Compute display relation for each row (handles MATRIX asymmetry)
        const processed = (userRows ?? []).map(r => ({
          ...r,
          display_relation: r.is_user_a
            ? r.relation_type
            : (MATRIX[r.other_type]?.[myType] ?? r.relation_type),
          rating_given:    r.rating_given    != null ? parseFloat(r.rating_given)    : null,
          rating_received: r.rating_received != null ? parseFloat(r.rating_received) : null,
          message_count:   parseInt(r.message_count ?? 0),
        }))

        setRows(processed)
      } catch (err) {
        setError(err?.message ?? 'Could not load your dynamics.')
      } finally {
        setLoading(false)
      }
    })()
  }, [isPremium, myType])

  // ── Free tier tease ────────────────────────────────────────────────────
  if (!isPremium) {
    const demoRows = [
      { rel: 'DUAL', count: 3, given: 4.8, received: 4.6, msgs: 284 },
      { rel: 'MIRROR', count: 2, given: 3.2, received: 3.5, msgs: 97 },
      { rel: 'ACTIVITY', count: 1, given: 4.1, received: null, msgs: 42 },
    ]
    return (
      <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
        {/* Blurred demo */}
        <div aria-hidden="true" style={{ filter: 'blur(5px)', opacity: 0.45, userSelect: 'none', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <SummaryCard label="Best rated" value="4.8" sub="Dual · 3 connections" colour="#2ecc71" />
            <SummaryCard label="Most active" value="284" sub="messages · Dual" colour="var(--accent)" />
            <SummaryCard label="Above avg" value="+0.6" sub="vs site for Dual" colour="#27ae60" />
          </div>
          {demoRows.map(r => (
            <div key={r.rel} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: GROUP_COLOURS[r.rel] ?? 'var(--accent)', width: 90, flexShrink: 0 }}>{RELATIONS[r.rel]?.name}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', width: 20 }}>{r.count}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${(r.given / 5) * 100}%`, background: GROUP_COLOURS[r.rel], borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.6rem', padding: '1.5rem', background: 'linear-gradient(to bottom, rgba(247,244,239,0.35), rgba(247,244,239,0.88))' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
            See how each relation type performs for you
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0, maxWidth: 320 }}>
            Premium shows your ratings given and received per relation type, message volumes, and how you compare to site averages.
          </p>
          <Link
            to="/premium"
            onClick={() => window.umami?.track('dynamics-tab-upgrade-clicked')}
            style={{ marginTop: '0.15rem', background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 500, padding: '0.45rem 1rem', borderRadius: 4 }}
          >
            Unlock with Premium
          </Link>
        </div>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return <p style={{ color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>
  }

  if (error) {
    return <p style={{ color: '#c0392b', fontSize: '0.85rem', padding: '1rem 0' }}>{error}</p>
  }

  // ── No connections ─────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
        <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>No connections yet.</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Make connections to start building your dynamics picture.</p>
      </div>
    )
  }

  // ── Aggregate by display relation ──────────────────────────────────────
  const byRel = {}
  for (const r of rows) {
    const key = r.display_relation
    if (!byRel[key]) byRel[key] = { key, rows: [] }
    byRel[key].rows.push(r)
  }

  const relStats = Object.values(byRel).map(({ key, rows: rrows }) => {
    const count         = rrows.length
    const ratingsGiven  = rrows.map(r => r.rating_given).filter(n => n != null)
    const ratingsRcvd   = rrows.map(r => r.rating_received).filter(n => n != null)
    const totalMessages = rrows.reduce((s, r) => s + r.message_count, 0)
    const avgGiven      = avg(ratingsGiven)
    const avgReceived   = avg(ratingsRcvd)
    const globalEntry   = globals[key]
    const globalAvg     = globalEntry?.avg ?? null
    const delta         = avgGiven != null && globalAvg != null ? avgGiven - globalAvg : null
    return { key, count, avgGiven, avgReceived, totalMessages, globalAvg, delta, ratingsGiven, ratingsRcvd }
  }).sort((a, b) => b.count - a.count)

  // ── Summary callouts ───────────────────────────────────────────────────
  const withRatings = relStats.filter(r => r.avgGiven != null)
  const bestRated   = withRatings.length ? [...withRatings].sort((a, b) => b.avgGiven - a.avgGiven)[0] : null
  const mostMsgs    = [...relStats].sort((a, b) => b.totalMessages - a.totalMessages)[0]
  const bestDelta   = withRatings.filter(r => r.delta != null).sort((a, b) => b.delta - a.delta)[0]

  const hasAnyRatings = relStats.some(r => r.avgGiven != null || r.avgReceived != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Summary cards */}
      {(bestRated || mostMsgs) && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {bestRated && (
            <SummaryCard
              label="Best rated"
              value={bestRated.avgGiven.toFixed(1)}
              sub={`${RELATIONS[bestRated.key]?.name} · ${bestRated.count} connection${bestRated.count !== 1 ? 's' : ''}`}
              colour={GROUP_COLOURS[bestRated.key]}
            />
          )}
          {mostMsgs && mostMsgs.totalMessages > 0 && (
            <SummaryCard
              label="Most active"
              value={mostMsgs.totalMessages.toLocaleString()}
              sub={`messages · ${RELATIONS[mostMsgs.key]?.name}`}
              colour="var(--accent)"
            />
          )}
          {bestDelta && bestDelta.delta != null && Math.abs(bestDelta.delta) >= 0.2 && (
            <SummaryCard
              label={bestDelta.delta >= 0 ? 'Above site avg' : 'Below site avg'}
              value={`${bestDelta.delta >= 0 ? '+' : ''}${bestDelta.delta.toFixed(1)}`}
              sub={`${RELATIONS[bestDelta.key]?.name} vs global`}
              colour={bestDelta.delta >= 0 ? '#2ecc71' : '#e74c3c'}
            />
          )}
        </div>
      )}

      {/* Breakdown table */}
      <div>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '110px 28px 1fr 1fr 44px', gap: '0.5rem', padding: '0 0 0.4rem', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Relation</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>n</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>You gave</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Received</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'right' }}>Msgs</span>
        </div>

        {relStats.map((r, i) => {
          const colour     = GROUP_COLOURS[r.key] ?? 'var(--accent)'
          const relName    = RELATIONS[r.key]?.name ?? r.key
          const minRatings = 2

          return (
            <div
              key={r.key}
              style={{ display: 'grid', gridTemplateColumns: '110px 28px 1fr 1fr 44px', gap: '0.5rem', padding: '0.7rem 0', borderBottom: i < relStats.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}
            >
              {/* Relation name */}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 500, color: colour, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{relName}</p>
                {r.globalAvg != null && r.avgGiven != null && (
                  <p style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                    site: {r.globalAvg.toFixed(1)}
                  </p>
                )}
              </div>

              {/* Count */}
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center' }}>{r.count}</span>

              {/* Rating given */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {r.ratingsGiven.length >= 1
                  ? <RatingBar value={r.avgGiven} globalAvg={r.ratingsGiven.length >= minRatings ? r.globalAvg : null} colour={colour} />
                  : <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>—</span>
                }
              </div>

              {/* Rating received */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {r.ratingsRcvd.length >= 1
                  ? <RatingBar value={r.avgReceived} globalAvg={null} colour={colour} />
                  : <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>—</span>
                }
              </div>

              {/* Messages */}
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'right' }}>
                {r.totalMessages > 0 ? r.totalMessages.toLocaleString() : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <p style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        The vertical marker on each bar shows the site average for that relation type.
        {!hasAnyRatings && ' Rate your connections to unlock rating comparisons.'}
      </p>

      {/* Theory note */}
      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.65, borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        Ratings are self-reported and the sample is small — treat patterns as directional, not definitive. Site averages update as more connections are rated.
      </p>
    </div>
  )
}
