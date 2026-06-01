import Layout from '../components/Layout'

export default function Support() {
  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          Keep it <em>independent</em>
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
          Socion's core is free and always will be. No algorithm, no matches locked away, no paywall between you and the theory. Premium unlocks the full experience for those who want it, but the experiment runs regardless.
        </p>

        <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
          If Socion's been useful to you, a one-time tip or a monthly tip helps cover it and keeps the project independent.
        </p>

        <div style={{
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '2rem', marginBottom: '3rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', color: 'var(--text)', lineHeight: 1.6 }}>
            <em>No pressure at all — just leaving it here.</em>
          </p>
          <a
            href="https://ko-fi.com/socion"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.95rem', padding: '0.75rem 2rem', display: 'inline-block' }}
            onClick={() => window.umami?.track('support-kofi-clicked')}
          >
            ☕ Support on Ko-fi
          </a>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>One-time tip or monthly. Cancel any time.</p>
        </div>

        <div style={{
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '2rem', marginBottom: '3rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', color: 'var(--text)', lineHeight: 1.6 }}>
            <em>Or grab a type mug.</em>
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, maxWidth: 420 }}>
            16 type-specific mugs — one for every Socionics type. Dictionary-definition style, printed on demand.
          </p>
          <a
            href="https://shop.socionicsinsight.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.95rem', padding: '0.75rem 2rem', display: 'inline-block' }}
            onClick={() => window.umami?.track('support-shop-clicked')}
          >
            🛒 Browse the shop
          </a>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Ships worldwide. Fulfilled by print-on-demand.</p>
        </div>

        <div style={{
          border: '1px solid var(--accent-lt)', borderRadius: 8,
          padding: '2rem', marginBottom: '3rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          textAlign: 'center', background: 'rgba(154,111,56,0.04)',
        }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', color: 'var(--text)', lineHeight: 1.6 }}>
            <em>Want your type pinned down?</em>
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, maxWidth: 440 }}>
            Get a written typing report from Spencer Stern — a considered, reasoned read on your type, with your Socion profile updated to match. Not a donation, a genuinely useful thing you can buy, and it happens to support the project too.
          </p>
          <a
            href="/typing"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.95rem', padding: '0.75rem 2rem', display: 'inline-block' }}
            onClick={() => window.umami?.track('support-get-typed-clicked')}
          >
            Get typed
          </a>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>From $29. Written report, delivered by email.</p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Other ways to help</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.8 }}>
              Not in a position to tip? That's completely fine. Sharing Socion with someone who'd be into it is genuinely more valuable at this stage — the network compounds with every new member.
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
