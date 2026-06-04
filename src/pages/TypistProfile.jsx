import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { TYPISTS } from '../lib/typists'
import { MATRIX, RELATIONS } from '../data/relations'

function viewerRelation(typistBaseType, viewerType) {
  if (!typistBaseType || !viewerType) return null
  try { return MATRIX?.[typistBaseType]?.[viewerType] ?? null }
  catch { return null }
}

export default function TypistProfile() {
  const { slug }                      = useParams()
  const { session, profile, loading } = useAuth()
  const navigate                      = useNavigate()

  const typist = TYPISTS[slug]

  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (!loading && session && !profile) navigate('/auth')
  }, [loading, session, profile])

  // Unknown slug → back to marketplace
  useEffect(() => {
    if (!loading && !typist) navigate('/typing', { replace: true })
  }, [loading, typist])

  if (loading || !profile || !typist) return null

  const alreadyVerifiedByThis = !!profile.verified_by && profile.verified_by === typist.verifiedBy
  const relation = viewerRelation(typist.type, profile.type)
  const relInfo  = relation ? RELATIONS[relation] : null

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/typing')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: '2rem', padding: 0,
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,3 5,7 9,11"/>
          </svg>
          All typists
        </button>

        <p className="eyebrow">Socion · Get typed</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.6rem' }}>
          Typed by <em>{typist.displayName}</em>
        </h1>

        {/* Typist meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
          <span style={{
            fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600,
            color: '#fff', background: typist.role === 'Founder' ? '#2c2a22' : 'var(--accent)',
            padding: '0.15rem 0.5rem', borderRadius: 2,
          }}>
            {typist.role}
          </span>
          <span style={{
            fontSize: '0.68rem', letterSpacing: '0.08em', fontWeight: 500,
            color: 'var(--accent)', border: '1px solid var(--accent-lt)',
            padding: '0.15rem 0.5rem', borderRadius: 2,
          }}>
            {typist.typeLabel}
          </span>
          {relInfo && profile.type !== typist.type && (
            <span style={{
              fontSize: '0.68rem', color: 'var(--muted)',
              border: '1px solid var(--border)',
              padding: '0.15rem 0.5rem', borderRadius: 2,
            }}>
              Your {relInfo.name}
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.75, marginBottom: '2.5rem' }}>
          {typist.bio}
        </p>

        {/* Already verified */}
        {alreadyVerifiedByThis && (
          <div style={{
            background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)',
            borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '2.5rem',
          }}>
            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--accent)', marginBottom: '0.35rem' }}>
              Your type is already confirmed ✓
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Your profile shows <strong style={{ color: 'var(--text)' }}>{profile.type}</strong>, confirmed by {profile.verified_by}. There's nothing more you need to do, but you're welcome to book another report if you'd like a fresh read.
            </p>
          </div>
        )}

        {/* How it works */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {typist.steps.map(([num, title, body]) => (
            <div key={num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--accent-lt)', lineHeight: 1, flexShrink: 0, width: 32 }}>
                {num}
              </span>
              <div>
                <p style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>{title}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.65 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* What you get */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, marginBottom: '1rem' }}>
            What you get
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {typist.whatYouGet.map((item, i) => (
              <li key={i} style={{ fontSize: '0.86rem', color: 'var(--text)', lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Tiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {typist.tiers.map(tier => (
            <a
              key={tier.key}
              href={tier.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => window.umami?.track('typing-checkout-clicked', { tier: tier.key, typist: typist.slug })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                border: `1px solid ${tier.highlight ? 'var(--accent)' : 'var(--border)'}`,
                background: tier.highlight ? 'rgba(154,111,56,0.05)' : '#fff',
                borderRadius: 8, padding: '1.25rem 1.5rem', textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
            >
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>{tier.name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Delivered within {tier.turnaround}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{tier.price}</p>
                <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: '0.35rem' }}>Get typed →</p>
              </div>
            </a>
          ))}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '2.5rem' }}>
          Payment is taken by Stripe. Straight after, you'll be taken to a short questionnaire to complete in your own time. Your report is written by hand and delivered by email, so confidence is honest rather than instant.
        </p>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Questions before you book?{' '}
            <a href={`mailto:${typist.contact}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{typist.contact}</a>
          </p>
        </div>
      </section>
    </Layout>
  )
}
