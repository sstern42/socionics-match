import { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

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

export default function Network() {
  const svgRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [graphData, setGraphData] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all matches with user types and message counts
        const { data: matches, error: matchErr } = await supabase
          .from('matches')
          .select(`
            id, relation_type, feedback_a, feedback_b,
            user_a:user_a_id(type),
            user_b:user_b_id(type),
            messages(id)
          `)

        if (matchErr) throw matchErr

        // Aggregate by type pair (canonical — alphabetical order)
        const edgeMap = {}

        for (const match of matches ?? []) {
          const typeA = match.user_a?.type
          const typeB = match.user_b?.type
          if (!typeA || !typeB || typeA === typeB) continue

          const key = [typeA, typeB].sort().join('--')

          if (!edgeMap[key]) {
            edgeMap[key] = {
              typeA: [typeA, typeB].sort()[0],
              typeB: [typeA, typeB].sort()[1],
              relation: match.relation_type,
              count: 0,
              messages: 0,
              ratings: [],
            }
          }

          edgeMap[key].count++
          edgeMap[key].messages += match.messages?.length ?? 0

          const ratings = [
            match.feedback_a?.rating,
            match.feedback_b?.rating,
          ].filter(Boolean)
          edgeMap[key].ratings.push(...ratings)
        }

        const edges = Object.values(edgeMap).map(e => ({
          ...e,
          avgRating: e.ratings.length > 0
            ? e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length
            : null,
        }))

        // Node stats
        const nodeStats = {}
        for (const type of TYPES) {
          const typeEdges = edges.filter(e => e.typeA === type || e.typeB === type)
          nodeStats[type] = {
            connections: typeEdges.reduce((s, e) => s + e.count, 0),
            messages: typeEdges.reduce((s, e) => s + e.messages, 0),
          }
        }

        setGraphData({ edges, nodeStats })
        setStats({
          totalConnections: matches?.length ?? 0,
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

  useEffect(() => {
    if (!graphData || !svgRef.current) return

    const { edges, nodeStats } = graphData
    const width = svgRef.current.clientWidth || 800
    const height = 560

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)

    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('markerWidth', 4)
      .attr('markerHeight', 4)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ccc')

    const nodes = TYPES.map(id => ({
      id,
      connections: nodeStats[id]?.connections ?? 0,
      messages: nodeStats[id]?.messages ?? 0,
    }))

    const links = edges.map(e => ({
      source: e.typeA,
      target: e.typeB,
      count: e.count,
      messages: e.messages,
      avgRating: e.avgRating,
      relation: e.relation,
    }))

    const maxCount = d3.max(links, d => d.count) || 1
    const maxMessages = d3.max(links, d => d.messages) || 1

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(36))

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => ratingColour(d.avgRating))
      .attr('stroke-width', d => 1 + (d.count / maxCount) * 5)
      .attr('stroke-opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: {
            pair: `${d.source.id} × ${d.target.id}`,
            relation: d.relation?.replace('_', '-') ?? '?',
            connections: d.count,
            messages: d.messages,
            avgRating: d.avgRating ? d.avgRating.toFixed(1) : 'No ratings yet',
          }
        })
      })
      .on('mouseleave', () => setTooltip(null))

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )
      .on('mouseenter', (event, d) => {
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: {
            type: d.id,
            quadra: QUADRA_LABELS[d.id],
            connections: d.connections,
            messages: d.messages,
          }
        })
      })
      .on('mouseleave', () => setTooltip(null))

    node.append('circle')
      .attr('r', d => 14 + (d.connections / (d3.max(nodes, n => n.connections) || 1)) * 10)
      .attr('fill', d => QUADRA_COLOURS[d.id] + '22')
      .attr('stroke', d => QUADRA_COLOURS[d.id])
      .attr('stroke-width', 2)

    node.append('text')
      .text(d => d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '0.72rem')
      .attr('font-family', 'var(--mono, monospace)')
      .attr('font-weight', 600)
      .attr('fill', d => QUADRA_COLOURS[d.id])
      .style('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => simulation.stop()
  }, [graphData])

  return (
    <Layout>
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(154,111,56,0.08)', border: '1px solid var(--accent-lt)', borderRadius: 3, padding: '0.2rem 0.6rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600 }}>Beta</span>
          </div>
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

        <div style={{ position: 'relative', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
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
          <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Rating</span>
            {[
              { colour: '#2ecc71', label: '4.5+' },
              { colour: '#9a6f38', label: '3.5–4.5' },
              { colour: '#f39c12', label: '2.5–3.5' },
              { colour: '#e74c3c', label: 'Below 2.5' },
              { colour: '#d4c9b8', label: 'Not yet rated' },
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
          Data is anonymised and aggregated by type pair. No individual profiles are shown. Updated in real time as members connect and rate.
        </p>
      </section>

      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
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
          maxWidth: 200,
        }}>
          {tooltip.content.type ? (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{tooltip.content.type} <span style={{ fontWeight: 300, color: 'var(--muted)' }}>· {tooltip.content.quadra}</span></p>
              <p style={{ color: 'var(--muted)' }}>{tooltip.content.connections} connections</p>
              <p style={{ color: 'var(--muted)' }}>{tooltip.content.messages} messages</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{tooltip.content.pair}</p>
              <p style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.08em' }}>{tooltip.content.relation}</p>
              <p style={{ color: 'var(--muted)', marginTop: '0.3rem' }}>{tooltip.content.connections} connection{tooltip.content.connections !== 1 ? 's' : ''}</p>
              <p style={{ color: 'var(--muted)' }}>{tooltip.content.messages} messages</p>
              <p style={{ color: 'var(--muted)' }}>Avg rating: {tooltip.content.avgRating}</p>
            </>
          )}
        </div>
      )}
    </Layout>
  )
}
