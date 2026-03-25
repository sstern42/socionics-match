import Layout from '../components/Layout'

export default function Privacy() {
  return (
    <Layout>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '2.5rem' }}>
          Privacy policy
        </h1>

        <div style={proseStyle}>
          <p style={metaStyle}>Last updated: 25 March 2026</p>

          <p>Socion is operated by Spencer Stern, London, UK. This policy explains what personal data we collect, how we use it, and your rights under UK GDPR.</p>

          <h2>What we collect</h2>
          <p>When you create an account and use Socion, we collect:</p>
          <ul>
            <li><strong>Account data</strong> — your email address and password (stored securely via Supabase Auth)</li>
            <li><strong>Profile data</strong> — your name, age, location, bio, Socionics type, and profile photo, as you provide them</li>
            <li><strong>Usage data</strong> — the connections you make, messages you send, and feedback ratings you submit</li>
            <li><strong>Analytics data</strong> — page views and navigation patterns via Umami, which is cookieless and does not track individuals across sites</li>
          </ul>

          <h2>How we use it</h2>
          <p>We use your data solely to operate the matching and messaging features of the app. Specifically:</p>
          <ul>
            <li>To display your profile to other users in the matching feed</li>
            <li>To match you with profiles based on intertype relations</li>
            <li>To deliver messages between connected users</li>
            <li>To send email notifications about new connections and messages (via Resend)</li>
            <li>To aggregate anonymised feedback data for research into Socionics intertype relations</li>
          </ul>
          <p>We do not sell your data. We do not use your data for advertising.</p>

          <h2>Who can see your data</h2>
          <p>Your profile (name, age, location, bio, type, and photo) is visible to other signed-in users of Socion. Your email address is never displayed to other users.</p>
          <p>Messages are visible to both participants in a conversation. As the platform operator, Spencer Stern has administrative access to message content for moderation purposes.</p>

          <h2>Third-party services</h2>
          <p>Socion uses the following third-party services, each of which has its own privacy policy:</p>
          <ul>
            <li><strong>Supabase</strong> — database, authentication, and file storage (EU West, Ireland)</li>
            <li><strong>Netlify</strong> — hosting and deployment</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Umami</strong> — cookieless, privacy-first analytics</li>
          </ul>

          <h2>Data retention</h2>
          <p>Your data is retained for as long as your account is active. If you delete your account, your profile, messages, and matches are deleted. Anonymised, aggregated research data may be retained.</p>

          <h2>Your rights</h2>
          <p>Under UK GDPR you have the right to access, correct, or delete your personal data. You can update your profile at any time via the Profile page. To request full deletion of your account and data, email <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)' }}>hello@socion.app</a>.</p>

          <h2>Cookies</h2>
          <p>Socion does not use cookies for tracking or advertising. Supabase Auth uses a session token stored in your browser's local storage to keep you signed in.</p>

          <h2>Changes to this policy</h2>
          <p>If we make material changes to this policy, we will update the date at the top of this page. Continued use of Socion after changes constitutes acceptance.</p>

          <h2>Contact</h2>
          <p>Questions about this policy: <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)' }}>hello@socion.app</a></p>
        </div>
      </section>
    </Layout>
  )
}

const proseStyle = {
  fontSize: '0.92rem',
  lineHeight: 1.85,
  color: 'var(--text)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
}

const metaStyle = {
  fontSize: '0.78rem',
  color: 'var(--muted)',
  marginBottom: '0.5rem',
}
