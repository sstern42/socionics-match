import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { RELATIONS, TYPES, getRelation } from '../data/relations'
import SIWebview from '../components/SIWebview'
import SwipeCard from '../components/feed/SwipeCard'
import HomeDashboard from './HomeDashboard'

const TESTIMONIALS = [
  {
    name: 'Intrion', type: 'ILE', relation: null, gender: 'male', avatar: null,
    quote: "An innovative experiment and tool in one — real utility, real potential.",
  },
  {
    name: 'Lena', type: 'ILE', relation: null, gender: 'female', avatar: null,
    quote: "Finally a place to connect with people who are as serious about Socionics as you are — and the app shows you the nature of each relation before you even say hello. A refreshing initiative. I hope it helps bring Socionics west.",
  },
  {
    name: 'Memes', type: 'EIE', relation: null, gender: 'female', avatar: null,
    quote: "Clear, convenient, curated. A chance worth taking.",
  },
]

function Avatar({ gender, avatar, name }) {
  if (avatar) return <img src={avatar} alt={name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  const initials = name.split(',')[0].trim()[0]
  const bg = gender === 'female' ? '#f0e8f8' : '#e8f0f8'
  const color = gender === 'female' ? '#7b4f9e' : '#4f6f9e'
  return (
    <div style={{ width: 52, height: 52, borderRadius: '50%', background: bg, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: '1.25rem', color, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function TestimonialsCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => {
      setActive(a => (a + 1) % TESTIMONIALS.length)
    }, 4000)
    return () => clearInterval(timer.current)
  }, [paused])

  function goTo(i) {
    setPaused(true)
    setActive(i)
    clearInterval(timer.current)
    timer.current = setTimeout(() => setPaused(false), 8000)
  }

  const t = TESTIMONIALS[active]

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem' }}>
      <p className="eyebrow">What members say</p>
      <div style={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <Avatar gender={t.gender} avatar={t.avatar} name={t.name} />
        <blockquote style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1rem,2.5vw,1.25rem)', fontStyle: 'italic', lineHeight: 1.7, color: 'var(--text)', margin: 0, maxWidth: 520 }}>
          &ldquo;{t.quote}&rdquo;
        </blockquote>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>{t.name}</span>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'rgba(154,111,56,0.08)', border: '1px solid var(--accent-lt)', padding: '0.15rem 0.5rem', borderRadius: 2 }}>{t.type}</span>
          {t.relation && <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t.relation}</span>}
        </div>
      </div>
      {TESTIMONIALS.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Testimonial ${i + 1}`} style={{ width: i === active ? 20 : 8, height: 8, borderRadius: 4, background: i === active ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer', padding: 0, transition: 'width 0.3s, background 0.3s' }} />
          ))}
        </div>
      )}
    </div>
  )
}

const DEMO_PROFILES = [
  { id: 'demo-ese', type: 'ESE', avatar_url: null, profile_data: { name: 'Elena',  dob: '1998-04-12', gender: 'Woman', country: 'DE', bio: 'Curious about people, loves deep conversations and figuring out what makes someone tick.' } },
  { id: 'demo-ile', type: 'ILE', avatar_url: null, profile_data: { name: 'Marcus', dob: '1994-09-03', gender: 'Man',   country: 'US', bio: 'Builder and systems thinker. Here to meet people who like discussing ideas seriously.' } },
  { id: 'demo-iei', type: 'IEI', avatar_url: null, profile_data: { name: 'Sofia',  dob: '2001-01-22', gender: 'Woman', country: 'BR', bio: 'Into philosophy, literature, and long walks. Looking for people who think carefully about the world.' } },
  { id: 'demo-lii', type: 'LII', avatar_url: null, profile_data: { name: 'Daniel', dob: '1996-07-30', gender: 'Man',   country: 'GB', bio: 'Quiet and precise, a bit obsessive about getting concepts exactly right.' } },
  { id: 'demo-see', type: 'SEE', avatar_url: null, profile_data: { name: 'Nadia',  dob: '1999-11-08', gender: 'Woman', country: 'CA', bio: 'Direct, warm, decisive. I like knowing where I stand with people.' } },
]

const DEMO_STACK = [
  { zIndex: 30, transform: 'none' },
  { zIndex: 20, transform: 'scale(0.96) translateY(14px)' },
  { zIndex: 10, transform: 'scale(0.92) translateY(28px)' },
]

function HomeSwipeDemo({ loggedIn }) {
  const [chosenType, setChosenType] = useState(null)
  const [queue, setQueue]   = useState([])
  const [matched, setMatched] = useState(null)
  const [done, setDone]     = useState(false)

  function start(type) {
    const withRel = DEMO_PROFILES
      .filter(p => p.type !== type)
      .map(p => ({ ...p, relation: getRelation(type, p.type), displayRelation: getRelation(p.type, type) }))
    setChosenType(type)
    setQueue(withRel)
    setMatched(null)
    setDone(false)
    window.umami?.track('home-swipe-demo-started', { type })
  }

  function handleSwipe(direction, profile) {
    if (direction === 'right') {
      setMatched(profile)
      window.umami?.track('home-swipe-demo-match', { relation: profile.displayRelation ?? profile.relation })
      return
    }
    setQueue(prev => {
      const rest = prev.filter(p => p.id !== profile.id)
      if (rest.length === 0) setDone(true)
      return rest
    })
  }

  function handleSkip(profile) {
    setQueue(prev => {
      const rest = prev.filter(p => p.id !== profile.id)
      return [...rest, profile]
    })
  }

  function continueAfterMatch() {
    setQueue(prev => {
      const rest = prev.filter(p => p.id !== matched.id)
      if (rest.length === 0) setDone(true)
      return rest
    })
    setMatched(null)
  }

  if (!chosenType) {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.4rem' }}>Try it</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Pick your type — or your best guess — and swipe a few profiles to see the dynamic you'd have with each.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
          {TYPES.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => start(t)}
              style={{ padding: '0.7rem 0.3rem', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--card-bg)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '0.82rem', fontWeight: 500, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
            >
              {t}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem' }}>
          Not sure?{' '}
          <Link to="/onboarding" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Find your type →</Link>
        </p>
      </div>
    )
  }

  if (matched) {
    const relInfo = RELATIONS[matched.displayRelation ?? matched.relation]
    const name = matched.profile_data?.name ?? matched.type
    return (
      <div style={{ maxWidth: 380, margin: '0 auto', background: 'var(--card-bg)', border: '1px solid var(--accent)', borderRadius: 10, padding: '1.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500 }}>It's a match</p>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 500 }}>You and <em>{name}</em></h3>
        {relInfo && (
          <div style={{ background: 'rgba(154,111,56,0.08)', border: '1px solid var(--accent-lt)', borderRadius: 6, padding: '0.65rem 1rem' }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500 }}>{relInfo.name}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5, marginTop: '0.2rem' }}>{relInfo.description}</p>
          </div>
        )}
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          {loggedIn
            ? `${name} is a demo profile. Head to your feed to swipe real members whose type fits yours.`
            : `That's the demo — ${name} isn't a real member. Sign up free to meet people whose type actually fits yours.`}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {loggedIn ? (
            <Link to="/feed" className="btn-primary" style={{ textDecoration: 'none' }} onClick={() => window.umami?.track('home-swipe-demo-to-feed', { from: 'match' })}>
              View your matches →
            </Link>
          ) : (
            <Link to="/onboarding?know=1" className="btn-primary" style={{ textDecoration: 'none' }} onClick={() => window.umami?.track('home-swipe-demo-signup', { from: 'match' })}>
              Sign up free to message →
            </Link>
          )}
          <button type="button" className="btn-ghost" onClick={continueAfterMatch}>Keep swiping</button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ maxWidth: 380, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
        <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--muted)' }}>That's the demo.</p>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, maxWidth: 300 }}>
          {loggedIn ? 'These were sample profiles. Head to your feed to swipe through real members.' : 'These were sample profiles. Sign up free to swipe through real members whose type fits the dynamics you want.'}
        </p>
        {loggedIn ? (
          <Link to="/feed" className="btn-primary" style={{ textDecoration: 'none' }} onClick={() => window.umami?.track('home-swipe-demo-to-feed', { from: 'end' })}>View your matches →</Link>
        ) : (
          <Link to="/onboarding?know=1" className="btn-primary" style={{ textDecoration: 'none' }} onClick={() => window.umami?.track('home-swipe-demo-signup', { from: 'end' })}>
            Sign up free →
          </Link>
        )}
        <button type="button" onClick={() => start(chosenType)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'underline' }}>
          Swipe again
        </button>
      </div>
    )
  }

  const visible = queue.slice(0, 3)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
        You're an <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>{chosenType}</strong> ·{' '}
        <button type="button" onClick={() => setChosenType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}>change</button>
      </p>
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, margin: '0 auto', height: 'min(70vh, 540px)' }}>
        {[...visible].reverse().map((profile, reverseIdx) => {
          const idx        = visible.length - 1 - reverseIdx
          const isTop      = idx === 0
          const stackEntry = DEMO_STACK[idx] ?? DEMO_STACK[DEMO_STACK.length - 1]
          return (
            <SwipeCard
              key={profile.id}
              profile={profile}
              isTop={isTop}
              zIndex={stackEntry.zIndex}
              stackTransform={stackEntry.transform}
              onSwipe={(direction) => handleSwipe(direction, profile)}
              onSkip={isTop ? () => handleSkip(profile) : undefined}
            />
          )
        })}
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center' }}>
        Swipe or use the buttons. Right to connect, left to pass.
      </p>
    </div>
  )
}

export default function Home() {
  const { session, profile } = useAuth()
  useEffect(() => {
    if (session && profile) return // dashboard branch sets its own title via Layout
    document.title = 'Socion™ — Match by Socionics type, not algorithm'
    return () => { document.title = 'Socion™' }
  }, [session, profile])
  const [webviewUrl, setWebviewUrl] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    supabase
      .from('stats')
      .select('users, countries, connections, types, messages, updated_at')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setStats(data)
          const age = Date.now() - new Date(data.updated_at).getTime()
          if (age > 6 * 60 * 60 * 1000) {
            fetch('https://hetjmvwhyibsxrkkgury.supabase.co/functions/v1/compute-stats', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
            }).then(() => {
              supabase.from('stats').select('users, countries, connections, types, messages').eq('id', 1).single()
                .then(({ data: fresh }) => { if (fresh) setStats(fresh) })
            })
          }
        }
      })
  }, [])

  if (session && profile) return <HomeDashboard />

  return (
    <>
    <Layout hideFooter>
      <section style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'clamp(2rem,6vw,4rem) 1.5rem clamp(2.5rem,6vw,4rem)', gap: 'clamp(1rem,2.5vw,1.5rem)' }}>

        <p className="eyebrow fade-up-1">{stats ? `${stats.users} members · ${stats.countries} countries` : ''}</p>

        <h1 className="fade-up-2">
          Match by <em>personality,</em><br />not algorithm.
        </h1>

        <p className="fade-up-3" style={{ fontSize: 'clamp(1rem,2.2vw,1.2rem)', color: 'var(--muted)', maxWidth: 480, lineHeight: 1.75 }}>
          Socionics maps 16 named dynamics between every type pair. You choose the dynamic — the app shows you who fits.
        </p>

        <div className="fade-up-4" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {session && profile ? (
            <Link to="/feed" className="btn-primary">View your matches</Link>
          ) : (
            <Link to="/onboarding" className="btn-primary">Get started free →</Link>
          )}
        </div>

        {!session && (
          <p className="fade-up-4" style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '-0.25rem' }}>
            New to Socionics?{' '}
            <button onClick={() => { window.umami?.track('si-link-home'); setWebviewUrl('https://socionicsinsight.com') }} style={{ color: 'var(--accent)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
              Start here →
            </button>
            {' '}&nbsp;·&nbsp;{' '}
            <Link to="/network" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Browse the network →
            </Link>
          </p>
        )}
        {session && (
          <p className="fade-up-4" style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '-0.25rem' }}>
            Not sure about your type?{' '}
            <Link to="/ask" style={{ color: 'var(--accent)', textDecoration: 'none' }} onClick={() => window.umami?.track('home-ask-hero-link')}>
              Ask the AI →
            </Link>
          </p>
        )}

        <p className="fade-up-4" style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Free &nbsp;·&nbsp; No app store &nbsp;·&nbsp; Works on any device
        </p>
      </section>

      {/* THE FEED — moved directly under the hero so the strongest proof isn't buried below the fold */}
      <section style={{ padding: '0 2rem 6rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '1rem' }}>The feed</p>
          <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            Every profile shows <em>your dynamic</em>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 500, margin: '0 auto 3rem', lineHeight: 1.7 }}>
            Not just a profile — a named relationship dynamic, computed from your type and theirs. Try it below.
          </p>

          <HomeSwipeDemo loggedIn={!!(session && profile)} />

          <div style={{ textAlign: 'center', marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--muted)', maxWidth: 420, lineHeight: 1.7 }}>
              Your feed shows real members whose type produces your selected dynamics.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {session && profile ? (
                <Link to="/feed" className="btn-primary">View your matches →</Link>
              ) : (
                <Link to="/onboarding" className="btn-primary">Get started free →</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', padding: '5rem 2rem', background: 'var(--card-bg)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p className="section-label">How it works</p>
          <h2 style={{ marginBottom: '3rem' }}>
            You choose the dynamic.<br />Not a black-box algorithm.
          </h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <h3>Find your type</h3>
              <p>A short questionnaire, or bring a type you already know from the community.</p>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <h3>Choose your dynamic</h3>
              <p>Select which relations you&rsquo;re open to. Duals for complementarity, Mirrors for sparring &mdash; you set the terms.</p>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <h3>Match with purpose</h3>
              <p>Dating, friendship, networking, and team building &mdash; same theory, your call.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats and testimonial share one strip instead of two full-width sections */}
      <section style={{ padding: '5rem 2rem', background: 'var(--surface, #f7f4ef)' }}>
        {stats && (
          <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
            {[
              { value: stats.users, label: 'members' },
              { value: stats.connections, label: 'connections' },
              { value: stats.messages, label: 'messages sent' },
              { value: stats.types, label: 'types represented' },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.3rem' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
        <TestimonialsCarousel />
      </section>

      {/* FEATURE CARDS — trimmed to the four most decision-relevant */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '6rem 2rem', background: 'var(--card-bg)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '1rem' }}>What you get</p>
          <h2 style={{ textAlign: 'center', marginBottom: '3.5rem' }}>Built differently<br />from the ground up</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2rem' }}>
            {[
              { title: '🔍 Transparent matching', body: 'Every connection shows the named relation type and its character. No black box — you see exactly why you were matched.' },
              { title: '🎯 You choose the dynamic', body: "Select which of the 16 relation types you want. Dual for deep complementarity. Mirror for intellectual sparring. Your terms, not the algorithm's." },
              { title: '🤖 Socionics AI', body: "Ask anything about types, relations, or your own dynamics. An AI assistant answers in seconds — and personalizes responses to your type.", link: '/ask' },
              { title: '✨ Free to join', body: "No app store. Browser-based and installable as a PWA. Sign up and you're on the feed in minutes — and the core is free, always." },
            ].map(({ title, body, link }) => (
              <div key={title} style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>{body}</p>
                {link && session && (
                  <Link to={link} style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none', marginTop: 'auto' }} onClick={() => window.umami?.track('home-feature-card-ask')}>
                    Try it →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', color: 'var(--text)', marginBottom: '1.5rem' }}>
            Ready to find your dynamic?
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {session && profile ? (
              <Link to="/feed" className="btn-primary">View your matches →</Link>
            ) : (
              <Link to="/onboarding" className="btn-primary">Get started free →</Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
    <SIWebview url={webviewUrl} onClose={() => setWebviewUrl(null)} />
    </>
  )
}
