import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { TYPIST_LIST, yearsExperience } from '../lib/typists'
import { MATRIX, RELATIONS } from '../data/relations'
const AVAILABILITY = {
  active: { label: 'Available', colour: '#4caf50' },
  paused: { label: 'Paused',    colour: '#f5a623' },
  full:   { label: 'Full',      colour: '#e53935' },
}

function viewerRelation(typistBaseType, viewerType) {
  if (!typistBaseType || !viewerType) return null
  try { return MATRIX?.[typistBaseType]?.[viewerType] ?? null }
  catch { return null }
}

function calcAge(birthYear) {
  if (!birthYear) return null
  return new Date().getFullYear() - birthYear
}

export default function Typing() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (!loading && session && !profile) navigate('/auth')
  }, [loading, session, profile])

  if (loading || !profile) return null

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Get <em>typed</em>
        </h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.75, marginBottom: '3rem' }}>
          Most people mistype themselves, especially early on. A typing report from a specialist gives you a considered, reasoned answer — so every match you make rests on the right type.
        </p>

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {TYPIST_LIST.map(typist => {
            const avail    = AVAILABILITY[typist.availability] ?? AVAILABILITY.active
            const relation = viewerRelation(typist.type, profile.type)
            const relInfo  = relation ? RELATIONS[relation] : null
            const alreadyVerifiedByThis = !!profile.verified_by && profile.verified_by === typist.verifiedBy
            const flag     = typist.flag ?? ''
            const yrs      = yearsExperience(typist.studyingSince)
            const age      = calcAge(typist.birthYear)

            return (
              <div
                key={typist.slug}
                style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-bg)', overflow: 'hidden' }}
              >
                {/* Header */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>

                  {/* Avatar + name row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {typist.avatarUrl
                        ? <img src={typist.avatarUrl} alt={typist.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--muted)', lineHeight: 1 }}>{typist.displayName[0]}</span>
                      }
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', flex: 1 }}>
                      <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>
                        {typist.displayName}
                        {flag && <span style={{ marginLeft: '0.4rem', fontSize: '1rem' }}>{flag}</span>}
                        {age  && <span style={{ fontFamily: 'var(--sans)', fontSize: '0.9rem', fontWeight: 300, color: 'var(--muted)', marginLeft: '0.25rem' }}>{age}</span>}
                      </h2>
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
                  </div>

                  {relInfo && profile.type !== typist.type && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>
                      A {relInfo.name.toLowerCase()}'s perspective on {profile.type} — {relInfo.description.toLowerCase()}
                    </p>
                  )}

                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
                    {typist.bio}
                  </p>

                  {typist.credibilityLine && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                      {typist.credibilityLine}
                    </p>
                  )}

                  {typist.testimonial && (
                    <div style={{ borderLeft: '2px solid var(--accent-lt)', paddingLeft: '0.75rem', margin: '0.25rem 0 0' }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
                        "{typist.testimonial.quote}"
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                        — {typist.testimonial.name}{typist.testimonial.type ? `, ${typist.testimonial.type}` : ''}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: 3 }}>
                      Delivery: {typist.method}
                    </span>
                    {yrs && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.2rem 0.6rem', borderRadius: 3 }}>
                        {yrs}+ years studying Socionics
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: avail.colour,
                      flexShrink: 0, display: 'inline-block',
                      animation: avail.label === 'Available' ? 'pulse 2s ease-in-out infinite' : 'none',
                    }} />
                    <span style={{ fontSize: '0.72rem', color: avail.colour }}>{avail.label}</span>
                  </div>
                </div>

                {/* Tiers + CTA */}
                <div style={{
                  padding: '1rem 1.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '1rem', flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {typist.tiers.map(tier => (
                      <span key={tier.key} style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{tier.name}</strong>
                        {' '}· {tier.price} · {tier.turnaround}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/typing/${typist.slug}`}
                    onClick={() => window.umami?.track('typist-view-clicked', { slug: typist.slug })}
                    style={{
                      display: 'inline-block',
                      background: 'var(--accent)', color: '#fff', textDecoration: 'none',
                      fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '0.6rem 1.25rem', borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    View typist →
                  </Link>
                </div>

                {alreadyVerifiedByThis && (
                  <div style={{ padding: '0.65rem 1.5rem', background: 'rgba(154,111,56,0.06)', borderTop: '1px solid var(--accent-lt)' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent)', margin: 0 }}>
                      ✓ Your type is already confirmed by {profile.verified_by}. You're welcome to book a fresh read.
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Placeholder */}
          <div style={{
            border: '1px dashed var(--border)', borderRadius: 8,
            padding: '2rem 1.5rem', textAlign: 'center', background: 'var(--surface)',
          }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.4rem' }}>
              More typists coming soon
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Interested in joining as a typist?{' '}
              <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Get in touch →
              </a>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  )
}
