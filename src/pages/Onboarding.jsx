import Layout from '../components/Layout'

export default function Onboarding() {
  return (
    <Layout>
      <section style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1.5rem', textAlign: 'center' }}>
        <p className="eyebrow">Step 1 of 3</p>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,4rem)' }}>
          What is your<br /><em>Socionics type?</em>
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480 }}>
          Type onboarding questionnaire — Phase 1. Coming soon.
        </p>
      </section>
    </Layout>
  )
}
