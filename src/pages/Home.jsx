import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const RELATION_PILLS = [
  { label: 'Duality',        hi: true },
  { label: 'Activity',       hi: true },
  { label: 'Mirror',         hi: false },
  { label: 'Semi-Dual',      hi: false },
  { label: 'Kindred',        hi: false },
  { label: 'Quasi-Identity', hi: false },
  { label: 'Contrary',       hi: false },
  { label: 'Conflict',       hi: false },
]

export default function Home() {
  const { session, profile } = useAuth()
  const ctaPath = session && profile ? '/feed' : '/onboarding'
  const ctaLabel = session && profile ? 'View your matches' : 'Find your type'

  const [stats, setStats] = useState(null)

  useEffect(() => {
    supabase
      .from('stats')
      .select('users, countries, connections, types')
      .eq('id', 1)
      .single()
      .then(({ data }) => { if (data) setStats(data) })
  }, [])

  return (
    <Layout>
      <section style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 2rem 6rem', gap: '1.5rem' }}>
        <p className="eyebrow fade-up-1">Live</p>

        <h1 className="fade-up-2">
          Match by <em>personality,</em><br />not algorithm.
        </h1>

        <p className="fade-up-3" style={{ fontSize: 'clamp(1rem,2.2vw,1.2rem)', color: 'var(--muted)', maxWidth: 520, lineHeight: 1.75 }}>
          Socionics maps 16 named relationship dynamics between every personality type &mdash;
          not just compatible or incompatible, but characterised dynamics each with a predictable pattern.
          This app puts that theory in your hands.
        </p>

        <div className="fade-up-4">
          <Link to={ctaPath} className="btn-primary">{ctaLabel}</Link>
        </div>

        <div className="fade-up-5" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
          {RELATION_PILLS.map(({ label, hi }) => (
            <span key={label} className={`rel-pill${hi ? ' active' : ''}`}>{label}</span>
          ))}
        </div>

        {stats && (
          <div className="fade-up-5" style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
            {[
              { value: stats.users, label: 'members' },
              { value: stats.countries, label: 'countries' },
              { value: stats.connections, label: 'connections' },
              { value: stats.types, label: 'types represented' },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.3rem' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ padding: '6rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <p className="section-label">How it works</p>
        <h2 style={{ marginBottom: '3.5rem' }}>
          You choose the dynamic.<br />Not a black-box algorithm.
        </h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Determine your type</h3>
            <p>Work through a structured onboarding questionnaire. Bring an existing type from the community &mdash; confidence scoring handles uncertainty honestly.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Choose your dynamic</h3>
            <p>Select which intertype relations you&rsquo;re open to. Duals for deep complementarity. Mirrors for intellectual sparring. You set the terms &mdash; the app surfaces who fits.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Match with purpose</h3>
            <p>Dating, friendship, networking, and team building. A Dual is a Dual whether you&rsquo;re dating or building a team.</p>
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <blockquote style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.4rem,3vw,2rem)', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.5, color: 'var(--text)', marginBottom: '1.5rem' }}>
            &ldquo;Unlike MBTI or the Big Five, Socionics is primarily a theory of intertype relations. The unit of analysis is the dyad, not the person.&rdquo;
          </blockquote>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            Developed in the 1970s on Jungian foundations, Socionics maps 16 specific dynamics between every type pair.
            Socion is built for the English-language Socionics community &mdash; and designed to generate real data on whether the theory holds at scale.
          </p>
        </div>
      </section>
    </Layout>
  )
}
