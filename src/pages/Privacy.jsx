import Layout from '../components/Layout'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Privacy() {
  usePageMeta('Privacy Policy | Socion™', 'Socion privacy policy — how your data is stored, what is shared with other members, your GDPR rights, and how to delete your account.')
  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '2.5rem' }}>
          Privacy policy
        </h1>

        <div style={proseStyle}>
          <p style={metaStyle}>Last updated: 30 September 2026</p>

          <p>Socion is operated by Spencer Stern, trading as Stern Consulting (sole trader). Unit 110172, PO Box 6945, London, W1A 6US, United Kingdom. Stern Consulting is the data controller for your personal data. This policy explains what personal data we collect, how we use it, and your rights under UK GDPR.</p>

          <h2>What we collect</h2>
          <p>When you create an account and use Socion, we collect:</p>
          <ul>
            <li><strong>Account data</strong> — your email address and how you sign in: with a one-time code sent to your email, or through Google or Discord (no password is stored). We use your email address to sign you in, to send service emails about your account, and, only if you opt in, to send Socion updates</li>
            <li><strong>Email preferences</strong> — whether you've agreed to Socion update emails, when and where you told us (for example at sign-up or in Settings), and, if you unsubscribe or an email bounces, a record that we must not email that address again</li>
            <li><strong>Profile data</strong> — your name, age, gender, location, bio, Socionics type, profile photo, and optional connection question, as you provide them</li>
            <li><strong>Usage data</strong> — the connections you make, messages you send, and feedback ratings you submit</li>
            <li><strong>Push notification tokens</strong> — if you enable push notifications, your device's push subscription endpoint is stored to deliver notifications</li>
            <li><strong>Analytics data</strong> — page views and navigation patterns via Umami, which is cookieless and does not track individuals across sites</li>
            <li><strong>Payment data</strong> — if you subscribe to Premium, your billing details (card number, billing address) are collected and stored by Stripe, our payment processor. We do not store your card details ourselves; we only receive a Stripe customer ID and subscription status.</li>
            <li><strong>AI assistant messages</strong> — if you use the Socionics AI assistant, the messages you send and your Socionics type are transmitted to Anthropic to generate responses. These are not stored by Socion beyond your conversation session.</li>
          </ul>

          <h2>How we use it</h2>
          <p>We use your data to run Socion and, where you've agreed, to keep you updated. Specifically:</p>
          <ul>
            <li>To create and secure your account and sign you in</li>
            <li>To display your profile to other users in the matching feed</li>
            <li>To match you with profiles based on intertype relations</li>
            <li>To deliver messages between connected users and in Rooms and Boards</li>
            <li>To send push notifications about new connections and messages, if you turn them on</li>
            <li>To send service emails about your account — for example Premium and billing emails, or referral rewards added to your account</li>
            <li>To send a single reminder if you start signing up but don't finish your profile (it has an unsubscribe link)</li>
            <li>To send occasional Socion updates by email, only if you've opted in (see <a href="#marketing-emails" style={{ color: 'var(--accent)' }}>Marketing emails</a> below)</li>
            <li>To process Premium payments through Stripe</li>
            <li>To answer your questions in the Socionics AI assistant and the typing chat, through Anthropic</li>
            <li>To keep the community safe: moderating reports, enforcing our terms, and preventing abuse</li>
            <li>To understand how the app is used, through cookieless Umami analytics, so we can improve it</li>
            <li>To aggregate anonymised feedback data for research into Socionics intertype relations</li>
          </ul>
          <p>We do not sell your data. We do not use your data for advertising.</p>

          <h2 id="marketing-emails">Marketing emails</h2>
          <p><strong>What we send.</strong> Occasional Socion updates — news about new features and the community, a few times a year at most. These are sent through MailerLite.</p>
          <p><strong>Legal basis.</strong> Your consent. We only send them if you've said yes: by ticking the box when you create your profile, by choosing "Yes, send me updates" when we ask in the app, or by turning on "Socion updates by email" in Settings. The box is never ticked for you, and saying no doesn't affect your account.</p>
          <p><strong>How to unsubscribe.</strong> Use the unsubscribe link at the bottom of any of these emails, or turn off "Socion updates by email" in Settings (Profile → Notifications). Either takes effect straight away and you can change your mind at any time.</p>
          <p><strong>Service emails continue.</strong> While you have an account, we'll still send emails you need about it — for example billing, Premium or security emails. These aren't marketing and aren't affected by your marketing choice.</p>
          <p><strong>What we keep.</strong> We keep a record of each consent choice (what you chose, when, and the wording you saw) so we can show what you agreed to. If you unsubscribe, or an email to you bounces, we keep your email address on a do-not-email list so you aren't emailed again, including after you delete your account.</p>

          <h2>Who can see your data</h2>
          <p>Your profile (name, age, location, bio, type, photo, and connection question if set) is visible to other signed-in users of Socion. Your email address is never displayed to other users.</p>
          <p>Direct messages are visible to both participants in a conversation. Messages posted in group Rooms are visible to all members of that Room. As the platform operator, Spencer Stern has administrative access to message content for moderation purposes.</p>

          <h2>Third-party services</h2>
          <p>Socion uses the following third-party services, each of which has its own privacy policy:</p>
          <ul>
            <li><strong>Supabase</strong> — database, authentication, and file storage (EU West, Ireland)</li>
            <li><strong>Netlify</strong> — hosting and deployment</li>
            <li><strong>Resend</strong> — service emails and reminders (account and payment emails, sent from mail.socion.app)</li>
            <li><strong>Google</strong> — optional sign-in via Google Identity Services</li>
            <li><strong>Discord</strong> — optional sign-in via Discord OAuth. We also post operational notifications to Socion's Discord server, such as a new sign-up with a partially masked email address</li>
            <li><strong>MailerLite</strong> — occasional Socion updates, sent only if you opt in (news.socion.app sending domain)</li>
            <li><strong>Umami</strong> — cookieless, privacy-first analytics</li>
            <li><strong>Stripe</strong> — payment processing for Premium subscriptions</li>
            <li><strong>Anthropic</strong> — AI responses for the Socionics AI assistant and the typing chat (messages you send are processed by Anthropic's API)</li>
          </ul>

          <h2>Data retention</h2>
          <p>Your data is retained for as long as your account is active. If you delete your account, your profile, messages, matches, and push subscriptions are permanently deleted. Anonymised, aggregated research data may be retained. Consent records and the do-not-email list described under Marketing emails are kept after deletion, so we can show what was agreed and make sure we never email you again. If you delete your account, you are also removed from our email list in MailerLite. If you have unsubscribed from our emails, we keep your email address on a suppression list solely to make sure we never email you again; it isn't used for anything else.</p>

          <h2>Your rights</h2>
          <p>Under UK GDPR you have the right to access, correct, or delete your personal data. You can update your profile at any time via the Profile page. You can permanently delete your account and all associated data directly in the app via Profile → Details → Delete account. For any other data requests, contact <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)' }}>hello@socion.app</a>.</p>

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
