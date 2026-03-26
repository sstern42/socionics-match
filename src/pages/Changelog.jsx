import Layout from '../components/Layout'

const ENTRIES = [
  {
    date: '26 March 2026',
    label: 'Update',
    items: [
      'Purpose pills on feed cards — see at a glance what each person is looking for',
      'Long bios now expand inline with a Read more toggle',
      'Gender field added to profiles — displayed alongside name and age on cards',
      'Unread message count — badge on the Messages nav link and browser tab title updates live',
      'Messages sidebar now shows last message preview and relative timestamp',
      'Sign out no longer flashes the sign-in page before redirecting home',
      'Messaging input no longer loses focus when sending or receiving messages',
      'Profile edit page now redirects correctly when not signed in',
      'Messaging page no longer hangs if profile data is missing',
    ],
  },
  {
    date: '25 March 2026',
    label: 'Update',
    items: [
      'Magic link sign-in — no password needed, just enter your email',
      'Purpose selector — choose Dating, Friendship, Networking, or Team building (or all four)',
      'Profile photos — upload a photo, shown on feed cards',
      'Country flags — select your country, flag emoji shown on your card',
      'Post-match feedback — rate connections after 5 messages to help validate the theory',
      'Privacy policy added at socion.app/privacy',
      'Email notifications for new connections and messages (with cooldown to avoid spam)',
      'Mobile navigation — burger menu on small screens',
      'Mobile messaging — full-screen conversation view on mobile',
      'Intertype relations matrix corrected — Kindred and Business pairs verified against reference',
      'Relation labels on feed cards now show the other person\'s role, not yours',
    ],
  },
  {
    date: '25 March 2026',
    label: 'Launch',
    items: [
      'Socion is live at socion.app',
      'Type onboarding questionnaire — determine your type or bring your own',
      'Matching feed — browse profiles filtered by intertype relation',
      '16 named relation types — auditable in the open source matrix',
      'Connect and message — realtime messaging with deep-link support from feed cards',
      'Profile editing — update details and relation preferences at any time',
    ],
  },
]

export default function Changelog() {
  return (
    <Layout>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          What's new
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '3rem' }}>
          A running log of updates to socion.app. Newest first.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {ENTRIES.map((entry, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: '1.1rem', fontWeight: 500, color: 'var(--text)' }}>
                  {entry.date}
                </span>
                <span style={{
                  fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--accent)', border: '1px solid var(--accent-lt)',
                  padding: '0.15rem 0.5rem', borderRadius: 2,
                }}>
                  {entry.label}
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {entry.items.map((item, j) => (
                  <li key={j} style={{ fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.7 }}>
                    {item}
                  </li>
                ))}
              </ul>
              {i < ENTRIES.length - 1 && (
                <div style={{ borderBottom: '1px solid var(--border)', marginTop: '3rem' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
            Questions or feedback?{' '}
            <a href="https://reddit.com/r/socionics" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              r/socionics
            </a>
            {' '}or{' '}
            <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              hello@socion.app
            </a>
          </p>
        </div>
      </section>
    </Layout>
  )
}
