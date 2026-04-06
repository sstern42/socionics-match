import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const TYPES = [
  'ILE', 'SEI', 'ESE', 'LII',
  'EIE', 'LSI', 'SLE', 'IEI',
  'SEE', 'ILI', 'LIE', 'ESI',
  'LSE', 'EII', 'IEE', 'SLI',
]

const QUADRA_COLOURS = {
  ILE: '#BA7517', SEI: '#BA7517', ESE: '#BA7517', LII: '#BA7517',
  EIE: '#791F1F', LSI: '#791F1F', SLE: '#791F1F', IEI: '#791F1F',
  SEE: '#0F6E56', ILI: '#0F6E56', LIE: '#0F6E56', ESI: '#0F6E56',
  LSE: '#185FA5', EII: '#185FA5', IEE: '#185FA5', SLI: '#185FA5',
}

const QUADRA_LABELS = {
  ILE: 'Alpha', SEI: 'Alpha', ESE: 'Alpha', LII: 'Alpha',
  EIE: 'Beta',  LSI: 'Beta',  SLE: 'Beta',  IEI: 'Beta',
  SEE: 'Gamma', ILI: 'Gamma', LIE: 'Gamma', ESI: 'Gamma',
  LSE: 'Delta', EII: 'Delta', IEE: 'Delta', SLI: 'Delta',
}

function ratingColour(avgRating) {
  if (!avgRating) return '#d4c9b8'
  if (avgRating >= 4.5) return '#2ecc71'
  if (avgRating >= 3.5) return '#9a6f38'
  if (avgRating >= 2.5) return '#f39c12'
  return '#e74c3c'
}

// Simple force simulation without D3
function useForceSimulation(nodes, edges, width, height) {
  const posRef = useRef({})
  const velRef = useRef({})
  const frameRef = useRef(null)
  const alphaRef = useRef(1)
  const [positions, setPositions] = useState({})
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (!nodes.length || !width) return

    // Initialise positions in a circle
    const cx = width / 2, cy = height / 2, r = Math.min(width, height) * 0.35
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI
      posRef.current[n.id] = posRef.current[n.id] || {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      }
      velRef.current[n.id] = velRef.current[n.id] || { vx: 0, vy: 0 }
    })

    alphaRef.current = 1
    setSettled(false)
    const DAMPING = 0.85
    const REPULSION = 3000
    const ATTRACTION = 0.04
    const REST_LENGTH = 120
    const CENTER_FORCE = 0.01

    function tick() {
      if (alphaRef.current < 0.005) { setSettled(true); return }
      alphaRef.current *= 0.98

      const ids = nodes.map(n => n.id)

      // Repulsion between all pairs
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = posRef.current[ids[i]]
          const b = posRef.current[ids[j]]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (REPULSION / (dist * dist)) * alphaRef.current
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          velRef.current[ids[i]].vx -= fx
          velRef.current[ids[i]].vy -= fy
          velRef.current[ids[j]].vx += fx
          velRef.current[ids[j]].vy += fy
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = posRef.current[edge.source]
        const b = posRef.current[edge.target]
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - REST_LENGTH) * ATTRACTION * alphaRef.current
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        velRef.current[edge.source].vx += fx
        velRef.current[edge.source].vy += fy
        velRef.current[edge.target].vx -= fx
        velRef.current[edge.target].vy -= fy
      }

      // Centering force
      for (const id of ids) {
        const p = posRef.current[id]
        velRef.current[id].vx += (cx - p.x) * CENTER_FORCE * alphaRef.current
        velRef.current[id].vy += (cy - p.y) * CENTER_FORCE * alphaRef.current
      }

      // Update positions
      for (const id of ids) {
        const p = posRef.current[id]
        const v = velRef.current[id]
        v.vx *= DAMPING
        v.vy *= DAMPING
        p.x = Math.max(24, Math.min(width - 24, p.x + v.vx))
        p.y = Math.max(24, Math.min(height - 24, p.y + v.vy))
      }

      setPositions({ ...posRef.current })
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [nodes.length, edges.length, width, height])

  const dragNode = useCallback((id, x, y) => {
    posRef.current[id] = { x, y }
    velRef.current[id] = { vx: 0, vy: 0 }
    setPositions({ ...posRef.current })
  }, [])

  const spread = useCallback(() => {
    if (!width || !nodes.length) return
    const cx = width / 2, cy = height / 2
    const r = Math.min(width, height) * 0.44
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI
      posRef.current[n.id] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      }
      velRef.current[n.id] = { vx: 0, vy: 0 }
    })
    alphaRef.current = 1
    setSettled(false)
    setPositions({ ...posRef.current })
  }, [nodes, width, height])

  return { positions, dragNode, spread, settled }
}

export default function Network() {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [graphData, setGraphData] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [stats, setStats] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const HEIGHT = fullscreen ? (window.innerHeight - 0) : 560

  // Lock body scroll in fullscreen
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width)
    })
    obs.observe(containerRef.current)
    setWidth(containerRef.current.clientWidth)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error: rpcErr } = await supabase.rpc('get_network_data')
        if (rpcErr) throw rpcErr

        const edges = (data ?? []).map(row => ({
          source: row.type_a,
          target: row.type_b,
          relation: row.relation_type,
          count: Number(row.connection_count),
          messages: Number(row.message_count),
          avgRating: row.avg_rating ? Number(row.avg_rating) : null,
        }))

        const nodeStats = {}
        for (const type of TYPES) {
          const te = edges.filter(e => e.source === type || e.target === type)
          nodeStats[type] = {
            connections: te.reduce((s, e) => s + e.count, 0),
            messages: te.reduce((s, e) => s + e.messages, 0),
          }
        }

        const maxConn = Math.max(...Object.values(nodeStats).map(n => n.connections), 1)
        const maxCount = Math.max(...edges.map(e => e.count), 1)
        const totalConnections = edges.reduce((s, e) => s + e.count, 0)

        setGraphData({ edges, nodeStats, maxConn, maxCount })
        setStats({
          totalConnections,
          totalEdges: edges.length,
          typesActive: TYPES.filter(t => nodeStats[t].connections > 0).length,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const nodes = TYPES.map(id => ({ id }))
  const edges = graphData?.edges ?? []

  const { session, profile } = useAuth()

  const { positions, dragNode, spread, settled } = useForceSimulation(
    graphData ? nodes : [],
    edges,
    width,
    fullscreen ? window.innerHeight : HEIGHT
  )

  // Drag handling
  function handleMouseDown(e, id) {
    e.preventDefault()
    setDragging(id)
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left
      const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top
      dragNode(dragging, x, y)
    }
    function onUp() { setDragging(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging, dragNode])

  const maxCount = graphData?.maxCount ?? 1
  const maxConn = graphData?.maxConn ?? 1

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p className="eyebrow">Live data</p>
          <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
            The theory <em>in real time</em>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 540, margin: '0.75rem auto 0', lineHeight: 1.7 }}>
            Every node is a Socionics type. Every edge is a real connection between members. Thickness shows connection volume. Colour shows average rating — green is high, amber is mid, red is low.
          </p>
        </div>

        {stats && (
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            {[
              { value: stats.totalConnections, label: 'Connections' },
              { value: stats.totalEdges, label: 'Type pairs connected' },
              { value: stats.typesActive, label: 'Types active' },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.3rem' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <div
          ref={containerRef}
          style={fullscreen ? {
            position: 'fixed', inset: 0, zIndex: 200,
            background: '#fff', overflow: 'hidden',
          } : {
            position: 'relative', background: '#fff',
            border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
          }}
        >
          {/* Spread button */}
          <button
            type="button"
            onClick={spread}
            disabled={!settled}
            title={settled ? 'Spread nodes' : 'Settling…'}
            style={{
              position: 'absolute', top: 10, right: fullscreen ? 80 : 110, zIndex: 10,
              background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '0.35rem 0.6rem',
              cursor: settled ? 'pointer' : 'default', fontSize: '0.75rem',
              color: settled ? 'var(--muted)' : 'var(--border)',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              backdropFilter: 'blur(4px)',
              opacity: settled ? 1 : 0.45,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            Spread
          </button>

          {/* Fullscreen toggle button */}
          <button
            type="button"
            onClick={() => setFullscreen(f => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="network-fullscreen-btn"
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 10,
              background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '0.35rem 0.6rem',
              cursor: 'pointer', fontSize: '0.75rem',
              color: 'var(--muted)', alignItems: 'center', gap: '0.3rem',
              backdropFilter: 'blur(4px)',
            }}
          >
            {fullscreen ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> Exit</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Fullscreen</>
            )}
          </button>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', zIndex: 2 }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Loading network data…</p>
            </div>
          )}
          {error && (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <p style={{ color: '#c0392b', fontSize: '0.88rem' }}>{error}</p>
            </div>
          )}
          <svg
            ref={svgRef}
            style={{ display: 'block', width: '100%', height: fullscreen ? '100vh' : HEIGHT, cursor: dragging ? 'grabbing' : 'default', touchAction: 'none' }}
            viewBox={`0 0 ${width || 800} ${fullscreen ? window.innerHeight : HEIGHT}`}
          >
            {/* Edges */}
            {width > 0 && edges.map(edge => {
              const src = positions[edge.source]
              const tgt = positions[edge.target]
              if (!src || !tgt) return null
              return (
                <line
                  key={`${edge.source}--${edge.target}`}
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke={ratingColour(edge.avgRating)}
                  strokeWidth={1 + (edge.count / maxCount) * 5}
                  strokeOpacity={0.65}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => setTooltip({
                    x: e.clientX, y: e.clientY,
                    edge: { ...edge }
                  })}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}

            {/* Nodes */}
            {width > 0 && TYPES.map(id => {
              const pos = positions[id]
              if (!pos) return null
              const conn = graphData?.nodeStats[id]?.connections ?? 0
              const r = 14 + (conn / maxConn) * 10
              const colour = QUADRA_COLOURS[id]
              return (
                <g
                  key={id}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: dragging === id ? 'grabbing' : 'grab' }}
                  onMouseDown={e => handleMouseDown(e, id)}
                  onTouchStart={e => handleMouseDown(e, id)}
                  onMouseEnter={e => setTooltip({
                    x: e.clientX, y: e.clientY,
                    node: { id, conn, messages: graphData?.nodeStats[id]?.messages ?? 0 }
                  })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle
                    r={r}
                    fill={colour + '22'}
                    stroke={colour}
                    strokeWidth={2}
                  />
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize="0.68rem"
                    fontFamily="var(--mono, monospace)"
                    fontWeight={600}
                    fill={colour}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {id}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Rating</span>
            {[
              { colour: '#2ecc71', label: '4.5+' },
              { colour: '#9a6f38', label: '3.5–4.5' },
              { colour: '#f39c12', label: '2.5–3.5' },
              { colour: '#e74c3c', label: 'Below 2.5' },
              { colour: '#d4c9b8', label: 'Unrated' },
            ].map(({ colour, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 24, height: 3, background: colour, borderRadius: 2 }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
          {['Alpha', 'Beta', 'Gamma', 'Delta'].map((quadra, i) => {
            const colours = ['#BA7517', '#791F1F', '#0F6E56', '#185FA5']
            return (
              <div key={quadra} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: colours[i] + '33', border: `2px solid ${colours[i]}` }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{quadra}</span>
              </div>
            )
          })}
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>· Node size = connection volume · Drag to explore</span>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2rem', lineHeight: 1.6 }}>
          Data is anonymised and aggregated by type pair. No individual profiles are shown.
        </p>

        {!session && (
          <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', marginBottom: '1rem', color: 'var(--text)' }}>
              Want to see where your type sits in this network?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/onboarding?know=1" className="btn-primary">I know my type →</Link>
              <Link to="/onboarding" className="btn-ghost">Help me find my type</Link>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '1rem' }}>
              Not ready to join yet?{' '}
              <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Join the Discord →
              </a>
            </p>
          </div>
        )}
      </section>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 14,
          top: tooltip.y - 10,
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '0.75rem 1rem',
          fontSize: '0.82rem',
          color: 'var(--text)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          zIndex: 1000,
          maxWidth: 210,
        }}>
          {tooltip.node ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>
                {tooltip.node.id} <span style={{ fontWeight: 300, color: 'var(--muted)' }}>· {QUADRA_LABELS[tooltip.node.id]}</span>
              </p>
              <p style={{ color: 'var(--muted)' }}>{tooltip.node.conn} connections</p>
              <p style={{ color: 'var(--muted)' }}>{tooltip.node.messages} messages</p>
            </>
          ) : tooltip.edge ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{tooltip.edge.source} × {tooltip.edge.target}</p>
              <p style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tooltip.edge.relation?.replace(/_/g, '-') ?? '?'}</p>
              <p style={{ color: 'var(--muted)', marginTop: '0.3rem' }}>{tooltip.edge.count} connection{tooltip.edge.count !== 1 ? 's' : ''}</p>
              <p style={{ color: 'var(--muted)' }}>{tooltip.edge.messages} messages</p>
              <p style={{ color: 'var(--muted)' }}>Avg rating: {tooltip.edge.avgRating ? tooltip.edge.avgRating.toFixed(1) : 'No ratings yet'}</p>
            </>
          ) : null}
        </div>
      )}
    </Layout>
  )
}
