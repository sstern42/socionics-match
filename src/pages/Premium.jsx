import Layout from '../components/Layout'
import { Link } from 'react-router-dom'

const FEATURES = [
  ['Connections', 'Unlimited active connections', '5 on free'],
  ['Relation filters', 'All 16 relation types in your feed', 'Same quadra only'],
  ['Message history', 'Full conversation history', 'Last 30 days'],
  ['Read receipts', 'See when messages are read', '—'],
  ['Profile views', 'See who viewed your profile', '—'],
  ['Founding member', 'Permanent free access — joined early', 'Current members only'],
]

export default function Premium() {
  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Premium — <em>coming soon</em>
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Socion's core will always be free. Premium unlocks the full experience for those who want it.
        </p>

        {/* Founding member callout */}
        <div style={{
          background: 'var(--accent)',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          marginBottom: '2.5rem',
          color: '#fff',
        }}>
          <p style={{ fontWeight: 600, fontSize: '0.88rem', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            Already a member? You're in. ✓
          </p>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, opacity: 0.9 }}>
            Everyone who joined before the premium launch gets founding member status — full access, free, permanently. No action needed.
          </p>
        </div>

        {/* Feature comparison */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            padding: '0.75rem 1rem',
          }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Feature</span>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', textAlign: 'center' }}>Premium</span>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'center' }}>Free</span>
          </div>
          {FEATURES.map(([label, premium, free], i) => (
            <div key={label} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              padding: '0.85rem 1rem',
              borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text)', textAlign: 'center', lineHeight: 1.4 }}>{premium}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>{free}</span>
            </div>
          ))}
        </div>

        {/* Price teaser */}
        <div style={{
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '1.5rem', textAlign: 'center', marginBottom: '2.5rem',
        }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', marginBottom: '0.4rem' }}>
            <em>One low annual price — details coming soon.</em>
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            We'll let you know when it's live.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Questions?{' '}
            <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Ask in the Discord</a>
            {' · '}
            <Link to="/help" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Help & FAQ</Link>
          </p>
        </div>
      </section>
    </Layout>
  )
}
