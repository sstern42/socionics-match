import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────
const AVATAR_URL =
  'https://hetjmvwhyibsxrkkgury.supabase.co/storage/v1/object/public/avatars/0adb0ebe-d883-4811-b94b-822fd16f6806/avatar.jpg'

const QUADRA_COLOURS = {
  alpha: '#2E8FBE',
  beta:  '#BA7517',
  gamma: '#0F6E56',
  delta: '#185FA5',
}

const QUADRAS = [
  { key: 'alpha', name: 'Alpha quadra', types: ['ILE', 'SEI', 'ESE', 'LII'] },
  { key: 'beta',  name: 'Beta quadra',  types: ['SLE', 'IEI', 'EIE', 'LSI'] },
  { key: 'gamma', name: 'Gamma quadra', types: ['SEE', 'ILI', 'LIE', 'ESI'] },
  { key: 'delta', name: 'Delta quadra', types: ['IEE', 'SLI', 'LSE', 'EII'] },
]

const RELATION_GROUPS = [
  { label: 'Within-quadra', names: 'Identity · Duality · Activity · Mirror' },
  { label: 'Cross-quadra',  names: 'Semi-duality · Kindred · Business · Quasi-identical' },
  { label: 'Asymmetric',    names: 'Benefactor · Beneficiary · Supervisor · Supervisee' },
  { label: 'Challenging',   names: 'Contrary · Extinguishment · Conflict · Super-ego' },
]

const DIFFERENTIATORS = [
  {
    title: 'Transparent logic',
    desc:  'The matching matrix is published and auditable. You can see exactly why you are being shown someone.',
  },
  {
    title: 'User agency',
    desc:  'Choose the specific dynamic you want — Dual, Mirror, Activity, any of the 16 — rather than delegating that choice to an algorithm.',
  },
  {
    title: 'Falsifiable',
    desc:  'The theory makes testable predictions. This app is built to validate or challenge them at scale.',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined) return '…'
  return n.toLocaleString()
}

function Divider() {
  return <div style={{ height: '0.5px', background: 'var(--border)', margin: '1.75rem 0' }} />
}

const body = {
  fontSize: '0.92rem',
  color: 'var(--text)',
  lineHeight: 1.8,
  margin: '0 0 1rem',
}

const h2 = {
  fontSize: '1.05rem',
  fontWeight: 500,
  margin: '0 0 0.75rem',
  color: 'var(--text)',
}

// ── Component ─────────────────────────────────────────────────────────
export default function About() {
  const [stats, setStats] = useState({ members: null, connections: null, messages: null })
  const [avatarOk, setAvatarOk] = useState(true)

  useEffect(() => {
    document.title = 'About · Socion'
    return () => { document.title = 'Socion' }
  }, [])

  useEffect(() => {
    supabase.rpc('get_public_stats').then(({ data }) => {
      if (!data) return
      setStats({
        members:     data.total_members     ?? null,
        connections: data.total_connections ?? null,
        messages:    data.total_ratings     ?? null,
      })
    })
  }, [])

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2.5rem 1.25rem 3rem' }}>

        {/* Eyebrow */}
        <p style={{
          fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 0.75rem',
        }}>
          About Socion
        </p>

        {/* Hero */}
        <h1 style={{
          fontSize: 'clamp(1.3rem, 4vw, 1.55rem)', fontWeight: 500,
          lineHeight: 1.35, margin: '0 0 1.5rem', color: 'var(--text)',
        }}>
          Built by someone who has been in the Socionics community for 22 years.
        </h1>

        {/* Founder intro with avatar */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '0' }}>
          {avatarOk ? (
            <img
              src={AVATAR_URL}
              alt="Spencer Stern"
              onError={() => setAvatarOk(false)}
              style={{
                width: 60, height: 60, borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
                border: '0.5px solid var(--border)',
              }}
            />
          ) : (
            <div style={{
              width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)',
              letterSpacing: '0.04em',
            }}>
              SS
            </div>
          )}

          <div style={{ flex: 1 }}>
            <p style={body}>
              Socion was built by Spencer Stern — solo, from scratch, in early 2026. Spencer is the
              founder of{' '}
              <a
                href="https://socionicsinsight.com"
                target="_blank"
                rel="noopener noreferrer"
                data-umami-event="si-click"
                data-umami-event-source="about"
                style={{ color: 'var(--text)', textUnderlineOffset: 3 }}
              >
                Socionics Insight
              </a>
              , the largest English-language Socionics reference, and has studied the theory since 2004.
              His type is ILE-C, verified by Jack Aaron at the World Socionics Society.
            </p>

            <p style={{ ...body, marginBottom: 0 }}>
              Socion exists because the theory deserves an honest empirical test at scale — and because
              every matching product on the market is a black box optimising for engagement rather than
              compatibility. The matching logic here is the published intertype relations matrix. You can
              inspect it, challenge it, and watch it play out.
            </p>
          </div>
        </div>

        <Divider />

        {/* What is Socionics */}
        <h2 style={h2}>What is Socionics?</h2>

        <p style={body}>
          Socionics is a personality framework developed in the 1970s by Lithuanian researcher Aushra
          Augusta, built on Jungian foundations. It defines 16 personality types and — unlike MBTI or
          the Big Five — maps the specific relationship dynamic between every possible pair. The unit of
          analysis is the dyad, not the individual.
        </p>

        <p style={{ ...body, marginBottom: '1.25rem' }}>
          The 16 types are grouped into four quadras: clusters of types that share core values,
          communication styles, and information metabolism. Within a quadra, types tend to understand
          each other readily. Across quadras, the dynamics shift.
        </p>

        {/* Quadra map */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '0.5rem' }}>
          {QUADRAS.map(q => {
            const c = QUADRA_COLOURS[q.key]
            return (
              <div key={q.key} style={{
                borderRadius: 10, padding: '0.9rem 1.1rem',
                border: `0.5px solid ${c}44`, background: `${c}0f`,
              }}>
                <p style={{
                  fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: c, margin: '0 0 8px',
                }}>
                  {q.name}
                </p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {q.types.map(t => (
                    <span key={t} style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      padding: '2px 7px', borderRadius: 4,
                      background: `${c}1c`, color: c,
                      letterSpacing: '0.04em',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <Divider />

        {/* The 16 intertype relations */}
        <h2 style={h2}>The 16 intertype relations</h2>

        <p style={body}>
          Every pair of types produces one of 16 named relationship dynamics — not just compatible or
          incompatible, but named, characterised, with predictable qualities. A Dual pairing creates
          natural complementarity. A Mirror pairing stimulates but can sting. A Conflict pairing drains
          both sides regardless of goodwill or effort.
        </p>

        <p style={{ ...body, marginBottom: '1.25rem' }}>
          These dynamics are not specific to romance. A Dual is a Dual whether you are dating, building
          a company, or making a friend. Socion lets you filter by the specific dynamic you are looking
          for — not just a demographic.
        </p>

        {/* Relations grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '0.5rem' }}>
          {RELATION_GROUPS.map(g => (
            <div key={g.label} style={{
              borderRadius: 8, padding: '0.75rem 1rem',
              background: 'var(--surface)', border: '0.5px solid var(--border)',
            }}>
              <p style={{
                fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 5px',
              }}>
                {g.label}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
                {g.names}
              </p>
            </div>
          ))}
        </div>

        <Divider />

        {/* Why Socion */}
        <h2 style={h2}>Why Socion?</h2>

        <p style={{ ...body, marginBottom: '1.25rem' }}>
          Most matching products optimise for time on site. Socion is designed to test a theory. Three
          things make it different.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '0.5rem' }}>
          {DIFFERENTIATORS.map(d => (
            <div key={d.title} style={{
              borderRadius: 10, padding: '1rem',
              border: '0.5px solid var(--border)', background: 'var(--bg)',
            }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>
                {d.title}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                {d.desc}
              </p>
            </div>
          ))}
        </div>

        <Divider />

        {/* Live stats */}
        <h2 style={h2}>Socion today</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '1.25rem 0 0.5rem' }}>
          {[
            { value: stats.members,     label: 'Members' },
            { value: stats.connections, label: 'Connections' },
            { value: stats.messages,    label: 'Ratings submitted' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', borderRadius: 8,
              padding: '1rem', textAlign: 'center',
            }}>
              <p style={{
                fontSize: '1.4rem', fontWeight: 500,
                color: 'var(--text)', margin: 0, lineHeight: 1.1,
                opacity: s.value === null ? 0.3 : 1,
                transition: 'opacity 0.3s',
              }}>
                {fmt(s.value)}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '5px 0 0' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>
          All 16 personality types represented.
        </p>

        <Divider />

        {/* Open source */}
        <p style={{ ...body, marginBottom: '0.75rem' }}>
          The codebase is open source — the matching logic is auditable by anyone. Community trust through
          transparency, not a proprietary black box.
        </p>

        <a
          href="https://github.com/sstern42/socionics-match"
          target="_blank"
          rel="noopener noreferrer"
          data-umami-event="github-click"
          data-umami-event-source="about"
          style={{ fontSize: '0.82rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          github.com/sstern42/socionics-match ↗
        </a>

      </div>
    </Layout>
  )
}
