import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { TYPISTS, calcAge, yearsExperience } from '../lib/typists'
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

  useEffect(() => {
    if (!loading && !typist) navigate('/typing', { replace: true })
  }, [loading, typist])

  if (loading || !profile || !typist) return null

  const alreadyVerifiedByThis = !!profile.verified_by && profile.verified_by === typist.verifiedBy
  const relation = viewerRelation(typist.type, profile.type)
  const relInfo  = relation ? RELATIONS[relation] : null
  const flag     = typist.flag ?? ''
  const yrs      = yearsExperience(typist.studyingSince)
  const age      = calcAge(typist.dob)

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

        {/* Avatar + heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {typist.avatarUrl
              ? <img src={typist.avatarUrl} alt={typist.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', color: 'var(--muted)', lineHeight: 1 }}>{typist.displayName[0]}</span>
            }
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', margin: 0 }}>
            Typed by <em>{typist.displayName}</em>
          </h1>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
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
          {typist.linkedin && (
            <a
              href={typist.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--muted)', textDecoration: 'none', opacity: 0.55 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452H17.1v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.765V9.196h3.204v1.558h.046c.446-.845 1.536-1.736 3.162-1.736 3.382 0 4.007 2.226 4.007 5.121v6.313zM5.337 7.433a1.857 1.857 0 1 1 0-3.714 1.857 1.857 0 0 1 0 3.714zm1.604 13.019H3.733V9.196h3.208v11.256zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          )}
        </div>

        {/* About row — flag, age, experience, links */}
        {(flag || age || yrs || (typist.links && typist.links.length > 0)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {(flag || age) && (
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {flag}{age ? <>{flag ? ' ' : ''}{age}</> : null}
              </span>
            )}
            {yrs && (
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Studying Socionics since {typist.studyingSince} <span style={{ color: 'var(--border)' }}>·</span> {yrs}+ years
              </span>
            )}
            {typist.links && typist.links.map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none' }}
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}

        {/* Relation context line */}
        {relInfo && profile.type !== typist.type && (
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            A {relInfo.name.toLowerCase()}'s perspective on {profile.type} — {relInfo.description.toLowerCase()}
          </p>
        )}

        {/* Bio */}
        <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.75, marginBottom: '0.75rem' }}>
          {typist.bio}
        </p>

        {/* Credibility line */}
        {typist.credibilityLine && (
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '2.5rem' }}>
            {typist.credibilityLine}
          </p>
        )}

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
          {typist.reportLength && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              Reports run {typist.reportLength}.
            </p>
          )}
        </div>

        {/* Testimonial — hidden until populated */}
        {typist.testimonial && (
          <div style={{ borderLeft: '3px solid var(--accent-lt)', paddingLeft: '1.25rem', marginBottom: '2.5rem' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
              "{typist.testimonial.quote}"
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
              — {typist.testimonial.name}{typist.testimonial.type ? `, ${typist.testimonial.type}` : ''}
            </p>
          </div>
        )}

        {/* Tiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
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
                background: tier.highlight ? 'rgba(154,111,56,0.05)' : 'var(--card-bg)',
                borderRadius: 8, padding: '1.25rem 1.5rem', textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
            >
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>{tier.name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Delivered within {tier.turnaround} of questionnaire completion</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{tier.price}</p>
                <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: '0.35rem' }}>Get typed →</p>
              </div>
            </a>
          ))}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '2.5rem' }}>
          Payment is taken by Stripe. Straight after, you'll be taken to the questionnaire to complete in your own time. The clock on your turnaround starts once you submit it — not at payment.
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
