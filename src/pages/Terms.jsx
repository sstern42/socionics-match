import Layout from '../components/Layout'

export default function Terms() {
  return (
    <Layout>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '2.5rem' }}>
          Terms of service
        </h1>

        <div style={proseStyle}>
          <p style={metaStyle}>Last updated: 30 March 2026</p>

          <p>These terms govern your use of Socion, operated by Spencer Stern, London, UK. By creating an account you agree to these terms. If you do not agree, do not use the service.</p>

          <h2>1. Eligibility</h2>
          <p>You must be at least 18 years old to use Socion. By registering, you confirm that you meet this requirement. If we discover a user is under 18, their account will be removed immediately.</p>

          <h2>2. Your account</h2>
          <p>You are responsible for maintaining the confidentiality of your account. You agree to provide accurate information in your profile and not impersonate another person or misrepresent your Socionics type. You may only create one account.</p>

          <h2>3. Acceptable use</h2>
          <p>You agree not to use Socion to:</p>
          <ul>
            <li>Harass, abuse, threaten, or intimidate other users</li>
            <li>Send unsolicited commercial messages or spam</li>
            <li>Post false, misleading, or fraudulent content</li>
            <li>Impersonate any person or entity</li>
            <li>Upload content that is illegal, obscene, or harmful</li>
            <li>Attempt to access other users' accounts or data</li>
            <li>Use the service for any unlawful purpose</li>
          </ul>
          <p>Violation of these rules may result in immediate account suspension or removal without notice.</p>

          <h2>4. Content ownership</h2>
          <p>You retain ownership of the content you post on Socion, including your profile information, bio, and messages. By posting content, you grant Socion a non-exclusive, royalty-free licence to display that content to other users as part of the service.</p>
          <p>You also agree that anonymised, aggregated data derived from your activity (such as feedback ratings on intertype relation matches) may be used for research purposes, as described in our <a href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none' }}>privacy policy</a>.</p>

          <h2>5. Blocking and reporting</h2>
          <p>Socion provides tools to cool off from or block other users. Reports submitted through the block feature are reviewed by the operator at our discretion. We do not guarantee a specific response time or outcome for any report. Where a report indicates a serious violation of these terms, we reserve the right to suspend or remove the reported account.</p>

          <h2>6. Account termination</h2>
          <p>We reserve the right to suspend or terminate any account at any time, with or without notice, if we believe a user has violated these terms or is using the service in a manner that is harmful to other users or the platform. You may delete your account and all associated data at any time directly in the app via Profile → Details → Delete account. Deletion is permanent and immediate.</p>

          <h2>7. Disclaimer and limitation of liability</h2>
          <p>Socion is provided on an "as is" basis. We make no warranties about the availability, accuracy, or suitability of the service. We are not responsible for the conduct of users on or off the platform. To the fullest extent permitted by law, our liability to you for any claim arising from your use of Socion is limited to the amount you have paid us in the twelve months preceding the claim — which, since the service is currently free, is zero.</p>
          <p>Nothing in these terms limits our liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under English law.</p>

          <h2>8. Third-party services</h2>
          <p>Socion uses Supabase for data storage and authentication, Resend for email delivery, and Umami for privacy-preserving analytics. Your use of these services is subject to their respective terms and policies.</p>

          <h2>9. Changes to these terms</h2>
          <p>We may update these terms from time to time. Continued use of Socion after changes are posted constitutes acceptance of the revised terms. The date at the top of this page reflects when these terms were last updated.</p>

          <h2>10. Governing law</h2>
          <p>These terms are governed by the laws of England and Wales. Any disputes arising under them shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

          <h2>Contact</h2>
          <p>Questions about these terms? Contact us at <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>hello@socion.app</a>.</p>
        </div>
      </section>
    </Layout>
  )
}

const proseStyle = {
  display: 'flex', flexDirection: 'column', gap: '1.25rem',
  fontSize: '0.92rem', lineHeight: 1.8, color: 'var(--text)',
}

const metaStyle = {
  fontSize: '0.78rem', color: 'var(--muted)',
}
