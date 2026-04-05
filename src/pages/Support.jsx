import Layout from '../components/Layout'

export default function Support() {
  return (
    <Layout noScroll>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          Keep it <em>free</em>
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
          Socion is free and will stay that way. No algorithm, no premium tier, no matches locked behind a paywall. The theory either works or it doesn't — charging for access would compromise the experiment.
        </p>

        <p style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
          It costs around <strong>£3 a month</strong> to run — just the domain. Everything else runs on free tiers. That comes out of my pocket. If Socion's been useful to you, a one-time tip or a monthly tip helps cover it and keeps the project independent.
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
              No ads. No selling your data. No locking matches behind a subscription. No proprietary algorithm deciding who you see. The intertype relations matrix is published and auditable. That's the commitment.
            </p>
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>Running costs</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              {[
                ['Hosting (Netlify)', 'Free tier'],
                ['Database (Supabase)', 'Free tier'],
                ['Email delivery (Resend)', 'Free tier'],
                ['Email newsletter (MailerLite)', 'Free tier'],
                ['Cloudflare', 'Free tier'],
                ['Domain — socion.app', '£33/yr (~£2.75/mo)'],
              ].map(([item, cost]) => (
                <div key={item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>{item}</span>
                  <span style={{ color: 'var(--muted)' }}>{cost}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>Total</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>£33/yr (~£2.75/mo)</span>
              </div>
            </div>
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
