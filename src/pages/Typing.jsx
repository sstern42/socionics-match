import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'

// Spencer's async written typing service. Payment is handled by Stripe payment
// links; on success Stripe redirects the buyer to the Tally questionnaire.
// No in-app payment, no typing_requests insert — the whole flow lives in
// Stripe + Tally + email. This page is the storefront and the hand-off.
const STRIPE_STANDARD = 'https://buy.stripe.com/fZu14m91Pfwl163fIudIA00'
const STRIPE_EXPRESS  = 'https://buy.stripe.com/bJefZg7XL4RH6qnbsedIA01'

const TIERS = [
  {
    key: 'standard',
    name: 'Standard',
    price: '$29',
    turnaround: 'Delivered within 5 days',
    href: STRIPE_STANDARD,
    highlight: false,
  },
  {
    key: 'express',
    name: 'Express',
    price: '$49',
    turnaround: 'Delivered within 48 hours',
    href: STRIPE_EXPRESS,
    highlight: true,
  },
]

const STEPS = [
  ['01', 'Pay', 'Choose Standard or Express below. Payment is handled securely by Stripe.'],
  ['02', 'Answer', "You're taken straight to a short questionnaire — twelve questions about how you think and relate. Answer in your own words."],
  ['03', 'Receive', 'Your written report lands by email within the timeframe you chose. It confirms your type, explains the reasoning, and your Socion profile is updated to match.'],
]

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

  const isVerified = !!profile.verified_by

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Get <em>typed</em>
        </h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.75, marginBottom: '2.5rem' }}>
          Most people mistype themselves, especially early on. A written typing report from Spencer Stern gives you a considered, reasoned answer, so every match you make rests on the right type.
        </p>

        {/* Already verified — no need to buy */}
        {isVerified && (
          <div style={{ background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
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
          {STEPS.map(([num, title, body]) => (
            <div key={num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--accent-lt)', lineHeight: 1, flexShrink: 0, width: 32 }}>{num}</span>
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
            {[
              'A written report confirming your type, with the reasoning behind it',
              'A clear read on your function stack and what it means for how you relate',
              'Practical guidance on the relations that fit you, for the Socion feed',
              'Your Socion type updated to match, so your matches are built on solid ground',
            ].map((item, i) => (
              <li key={i} style={{ fontSize: '0.86rem', color: 'var(--text)', lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Tiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {TIERS.map(tier => (
            <a
              key={tier.key}
              href={tier.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => window.umami?.track('typing-checkout-clicked', { tier: tier.key })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                border: `1px solid ${tier.highlight ? 'var(--accent)' : 'var(--border)'}`,
                background: tier.highlight ? 'rgba(154,111,56,0.05)' : '#fff',
                borderRadius: 8, padding: '1.25rem 1.5rem', textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
            >
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.2rem' }}>
                  {tier.name}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{tier.turnaround}</p>
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
            <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>hello@socion.app</a>
          </p>
        </div>
      </section>
    </Layout>
  )
}
