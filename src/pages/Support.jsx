import Layout from '../components/Layout'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Support() {
  usePageMeta('Support Socion™ — Ad-Free & Independent', 'Socion is ad-free and built by one person. Tip on Ko-fi or keep using it free — every bit of support helps.')
  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          Keep it <em>independent</em>
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
          Socion is ad-free, algorithm-free, and built by one person without funding. The core is free and always will be.
        </p>

        <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
          If it's been useful, a tip helps cover the running costs and keeps the project going. Even a one-time £3 makes a difference.
        </p>

        {/* Ko-fi — primary */}
        <div style={{
          border: '1px solid var(--accent)',
          borderRadius: 8,
          padding: '2rem',
          marginBottom: '1.5rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          textAlign: 'center',
          background: 'rgba(154,111,56,0.06)',
        }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', color: 'var(--text)', lineHeight: 1.6 }}>
            <em>Support on Ko-fi</em>
          </p>
          <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.7, maxWidth: 420 }}>
            Tips go directly toward server costs and keeping Socion free. A £3 tip covers about a day of running costs. No account needed, takes 30 seconds.
          </p>
          <a
            href="https://ko-fi.com/socion"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.95rem', padding: '0.75rem 2.5rem', display: 'inline-block' }}
            onClick={() => window.umami?.track('support-kofi-clicked')}
          >
            ☕ Tip £3 on Ko-fi
          </a>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>one-time · no account needed · takes 30 seconds</p>
        </div>

        {/* Typing — secondary, inline */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem',
        }}>
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', color: 'var(--text)' }}>
              <em>Get your type confirmed</em>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7, flex: 1 }}>
              A written typing report from a Socion typist — reasoned, considered, and your profile updated to match. From $29.
            </p>
            <a
              href="/typing"
              className="btn-ghost"
              style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.6rem 1.25rem', display: 'inline-block', textAlign: 'center' }}
              onClick={() => window.umami?.track('support-get-typed-clicked')}
            >
              Browse typists →
            </a>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Other ways to help</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.8 }}>
              Not in a position to tip? Sharing Socion with someone who'd be into it is genuinely more valuable at this stage — the network compounds with every new member.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>What Socion will never do</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.8 }}>
              No ads. No selling your data. No proprietary algorithm deciding who you see. The intertype relations matrix is published and auditable. That's the commitment.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Socion is built and maintained by <a href="https://spencerstern.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Spencer Stern</a> — independently, without funding or a team. Questions or feedback: <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>hello@socion.app</a>
            {' · '}
            <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Join the Discord</a>
          </p>
        </div>
      </section>
    </Layout>
  )
}
