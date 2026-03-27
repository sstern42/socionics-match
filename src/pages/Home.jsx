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
      .select('users, countries, connections, types, updated_at')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setStats(data)
          // Refresh if stats are older than 6 hours
          const age = Date.now() - new Date(data.updated_at).getTime()
          if (age > 6 * 60 * 60 * 1000) {
            fetch('https://hetjmvwhyibsxrkkgury.supabase.co/functions/v1/compute-stats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            }).then(() => {
              supabase.from('stats').select('users, countries, connections, types').eq('id', 1).single()
                .then(({ data: fresh }) => { if (fresh) setStats(fresh) })
            })
          }
        }
      })
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

      <section style={{ borderTop: '1px solid var(--border)', padding: '6rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '1rem' }}>The feed</p>
          <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            Every profile shows <em>your dynamic</em>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 500, margin: '0 auto 3.5rem', lineHeight: 1.7 }}>
            Not just a profile — a named relationship dynamic, its character, and a link to the full theory.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem', pointerEvents: 'none', userSelect: 'none' }}>
            {[
              { initial: 'E', name: 'Elena, 27 👩', flag: '🇩🇪', type: 'ESE', purposes: ['Friendship', 'Dating'], rel: 'Dual', relDesc: "Full complementarity. Each type's strengths meet the other's blind spots.", bio: 'Curious about people, loves deep conversations and understanding what makes someone tick.', highlight: true },
              { initial: 'M', name: 'Marcus, 31 👨', flag: '🇺🇸', type: 'ILE', purposes: ['Networking'], rel: 'Mirror', relDesc: 'Intellectually aligned but prone to mutual criticism.', bio: 'Builder, systems thinker. Looking to connect with people who want to discuss ideas seriously.', highlight: false },
              { initial: 'S', name: 'Sofia, 24 👩', flag: '🇧🇷', type: 'IEI', purposes: ['Friendship'], rel: 'Activity', relDesc: 'Energising and stimulating. Can become unstable at close range.', bio: 'Into philosophy, literature, and long walks. Looking for people who think carefully about the world.', highlight: false },
            ].map(({ initial, name, flag, type, purposes, rel, relDesc, bio, highlight }) => (
              <div key={name} style={{ background: 'var(--bg)', border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 300 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e8e2d9', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--muted)' }}>{initial}</div>
                    <div>
                      <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 500 }}>{name}</p>
                      <p style={{ fontSize: '1rem', marginTop: 2 }}>{flag}</p>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        {purposes.map(p => <span key={p} style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 2, padding: '0.1rem 0.4rem' }}>{p}</span>)}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, color: highlight ? 'var(--accent)' : 'var(--muted)', background: highlight ? 'rgba(154,111,56,0.10)' : 'rgba(100,100,100,0.05)', border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`, padding: '0.25rem 0.6rem', borderRadius: 3 }}>{type}</span>
                </div>
                <div style={{ background: highlight ? 'rgba(154,111,56,0.08)' : 'rgba(100,100,100,0.04)', border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 4, padding: '0.6rem 0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: highlight ? 'var(--accent)' : 'var(--muted)', fontWeight: 500 }}>{rel}</p>
                    <span style={{ fontSize: '0.68rem', color: highlight ? 'var(--accent)' : 'var(--muted)', opacity: 0.7 }}>Learn more →</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{relDesc}</p>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 300, flex: 1 }}>{bio}</p>
                <div style={{ height: 38, background: 'var(--accent)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', fontWeight: 500 }}>Connect</span>
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--muted)', marginTop: '2rem', fontStyle: 'italic' }}>
            Sample profiles — your feed shows real members whose type produces your selected dynamics.
          </p>
        </div>
      </section>

      <section style={{ padding: '6rem 2rem', maxWidth: 900, margin: '0 auto' }}>
        <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '1rem' }}>What you get</p>
        <h2 style={{ textAlign: 'center', marginBottom: '3.5rem' }}>Built differently<br />from the ground up</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2rem' }}>
          {[
            { title: 'Transparent matching', body: 'Every connection shows the named relation type and its character. No black box — you see exactly why you were matched.' },
            { title: 'You choose the dynamic', body: 'Select which of the 16 relation types you want. Dual for deep complementarity. Mirror for intellectual sparring. Your terms, not the algorithm's.' },
            { title: 'Four purposes', body: 'Dating, friendship, networking, and team building. The same theory applies to all — a Dual is a Dual whether you're dating or building a product team.' },
            { title: 'Open source', body: 'The intertype relations matrix is published and auditable. Community trust through transparency, not a proprietary algorithm.' },
            { title: 'Real data', body: 'Every connection and rating tests the theory at scale. You're part of the first large-scale empirical test of Socionics in the English-speaking world.' },
            { title: 'Free to join', body: 'No app store. No subscription. Browser-based and installable as a PWA. Sign up and you're on the feed in minutes.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: 6, background: '#fff' }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>{title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300 }}>{body}</p>
            </div>
          ))}
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
