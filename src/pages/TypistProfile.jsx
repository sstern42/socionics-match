import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePageMeta } from '../hooks/usePageMeta'
import { TYPISTS, calcAge, yearsExperience } from '../lib/typists'
import FlagImage from '../components/FlagImage'
import { MATRIX, RELATIONS } from '../data/relations'

const DISCORD_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
)

const LINKEDIN_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452H17.1v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.765V9.196h3.204v1.558h.046c.446-.845 1.536-1.736 3.162-1.736 3.382 0 4.007 2.226 4.007 5.121v6.313zM5.337 7.433a1.857 1.857 0 1 1 0-3.714 1.857 1.857 0 0 1 0 3.714zm1.604 13.019H3.733V9.196h3.208v11.256zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

function viewerRelation(typistBaseType, viewerType) {
  if (!typistBaseType || !viewerType) return null
  try { return MATRIX?.[typistBaseType]?.[viewerType] ?? null }
  catch { return null }
}

// Per-typist meta descriptions
const META_DESCRIPTIONS = {
  spencer:     'Get your Socionics type confirmed by Spencer, founder of Socion and Socionics Insight. Async written report, 3,500–5,000 words, delivered within your chosen timeframe.',
  'uncle-sam': 'Get your Socionics type confirmed by Uncle Sam. Voice session with personalised written report. 422+ clients typed. Choose from three session tiers.',
}

export default function TypistProfile() {
  const { slug }                      = useParams()
  const { session, profile, loading } = useAuth()
  const navigate                      = useNavigate()
  const typist = TYPISTS[slug]

  usePageMeta(
    typist ? `Get Typed by ${typist.displayName} — Socionics Typing | Socion™` : 'Get Your Socionics Type Confirmed | Socion™',
    typist ? (META_DESCRIPTIONS[slug] ?? `Get your Socionics type confirmed by ${typist.displayName} on Socion.`) : undefined
  )

  useEffect(() => {
    if (!loading && !typist) navigate('/typing', { replace: true })
  }, [loading, typist])

  if (loading || !typist) return null

  const alreadyVerifiedByThis = !!profile?.verified_by && profile.verified_by === typist.verifiedBy
  const relation = viewerRelation(typist.type, profile?.type)
  const relInfo  = relation ? RELATIONS[relation] : null
  const flag     = typist.flag ?? ''
  const yrs      = yearsExperience(typist.studyingSince)
  const age      = calcAge(typist.dob)
  const bookingReady = typist.bookingReady !== false

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/typing')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,3 5,7 9,11"/>
          </svg>
          All typists
        </button>

        <p className="eyebrow">Socion · Get typed</p>

        {/* Avatar + heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', fontWeight: 500, color: 'var(--accent)', border: '1px solid var(--accent-lt)', padding: '0.15rem 0.5rem', borderRadius: 2 }}>
            {typist.typeLabel}
          </span>
          {profile && relInfo && profile.type !== typist.type && (
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.15rem 0.5rem', borderRadius: 2 }}>
              Your {relInfo.name} relation
            </span>
          )}
          {typist.linkedin && (
            <a href={typist.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              {LINKEDIN_ICON}
            </a>
          )}
          {typist.discordUrl && !typist.linkedin && (
            <a href={typist.discordUrl} target="_blank" rel="noopener noreferrer" aria-label="Discord"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              {DISCORD_ICON}
            </a>
          )}
        </div>

        {/* About row */}
        {(flag || age || yrs || (typist.links && typist.links.length > 0) || typist.discordUrl) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {(flag || age) && (
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {flag && <FlagImage code={flag} style={{ marginRight: age ? '0.3rem' : 0 }} />}{age ?? null}
              </span>
            )}
            {yrs && (
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Studying Socionics since {typist.studyingSince} <span style={{ color: 'var(--border)' }}>·</span> {yrs}+ years
              </span>
            )}
            {typist.links && typist.links.map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none' }}>
                {link.label} ↗
              </a>
            ))}
            {typist.discordUrl && (
              <a href={typist.discordUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none' }}>
                Discord community ↗
              </a>
            )}
          </div>
        )}

        {/* Relation context line */}
        {profile && relInfo && profile.type !== typist.type && (
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            A {relInfo.name.toLowerCase()} relation's perspective on {profile.type} — {relInfo.description.toLowerCase()}
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
          <div style={{ background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--accent)', marginBottom: '0.35rem' }}>Your type is already confirmed ✓</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Your profile shows <strong style={{ color: 'var(--text)' }}>{profile.type}</strong>, confirmed by {profile.verified_by}. There's nothing more you need to do, but you're welcome to book another report if you'd like a fresh read.
            </p>
          </div>
        )}

        {/* How it works */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {typist.steps.map(([num, title, body]) => (
            <div key={num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--accent-lt)', lineHeight: 1, flexShrink: 0, width: 32 }}>{num}</span>
              <div>
                <p style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>{title}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.65 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* What you get — only shown when populated */}
        {typist.whatYouGet && typist.whatYouGet.length > 0 && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', marginBottom: '2.5rem', background: 'var(--card-bg)' }}>
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
        )}

        {/* Testimonial */}
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
        {typist.tiersLabel && (
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, marginBottom: '0.75rem' }}>
            {typist.tiersLabel}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {typist.tiers.map(tier => {
            // Determine wrapper: signed-in + bookingReady → external Stripe link
            //                    signed-out + bookingReady → sign-in prompt (Link)
            //                    not bookingReady           → inert div
            const isSignedIn = !!session
            const canBook    = bookingReady && isSignedIn
            const needsSignIn = bookingReady && !isSignedIn

            const TierWrapper  = canBook ? 'a' : needsSignIn ? Link : 'div'
            const tierLinkProps = canBook
              ? {
                  href: tier.href,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  onClick: () => window.umami?.track('typing-checkout-clicked', { tier: tier.key, typist: typist.slug }),
                }
              : needsSignIn
              ? {
                  to: `/auth?redirect=/typing/${typist.slug}`,
                  onClick: () => window.umami?.track('typing-signin-prompted', { tier: tier.key, typist: typist.slug }),
                }
              : {}

            return (
              <TierWrapper
                key={tier.key}
                {...tierLinkProps}
                style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
                  border: `1px solid ${tier.highlight ? 'var(--accent)' : 'var(--border)'}`,
                  background: tier.highlight ? 'rgba(154,111,56,0.05)' : 'var(--card-bg)',
                  borderRadius: 8, padding: '1.25rem 1.5rem',
                  textDecoration: 'none',
                  opacity: bookingReady ? 1 : 0.72,
                  cursor: bookingReady ? 'pointer' : 'default',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>{tier.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: tier.description ? '0.6rem' : 0 }}>
                    {tier.turnaroundLabel || tier.turnaround}
                  </p>
                  {tier.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
                      {tier.description}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {tier.wasPrice && (
                    <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1, textDecoration: 'line-through', opacity: 0.5, marginBottom: '0.2rem' }}>{tier.wasPrice}</p>
                  )}
                  <p style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>{tier.price}</p>
                  <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: bookingReady ? 'var(--accent)' : 'var(--muted)', marginTop: '0.35rem' }}>
                    {canBook ? 'Book →' : needsSignIn ? 'Sign in to book →' : 'Coming soon'}
                  </p>
                </div>
              </TierWrapper>
            )
          })}
        </div>

        {/* Coming soon note */}
        {!bookingReady && (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
            Booking opens shortly. In the meantime, get in touch via{' '}
            <a href={`mailto:${typist.contact}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{typist.contact}</a>
            {' '}to register your interest.
          </p>
        )}

        {/* Sign-in prompt for unauthenticated visitors */}
        {!session && bookingReady && (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
            <Link to={`/auth?redirect=/typing/${typist.slug}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Create a free Socion account
            </Link>
            {' '}to book — takes under a minute.
          </p>
        )}

        {/* Referral note */}
        {typist.referralNote && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>Refer a friend, get $10 back</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{typist.referralNote}</p>
            </div>
          </div>
        )}

        {/* Payment note — only shown when signed in and booking is ready */}
        {session && bookingReady && typist.paymentNote && (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '2.5rem' }}>
            {typist.paymentNote}
          </p>
        )}

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
