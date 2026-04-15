import Layout from '../components/Layout'

export const ENTRIES = [
  {
    date: '15 April 2026',
    label: 'Update',
    items: [
      'Get typed — typing sessions are now free. No charge during the current beta period',
      'Support page — shop link added. Browse 16 type-specific mugs at shop.socionicsinsight.com',
      'Support page — running costs breakdown removed',
    ],
  },
  {
    date: '8 April 2026',
    label: 'Update',
    items: [
      'Get typed — book a one-to-one Socionics typing session with our resident typist via Discord voice call. A verified badge is added to your profile on completion',
      'Get typed — accessible from the nav for all logged-in members',
      'Get typed — Discord username required at the point of booking so the typist can reach you directly',
    ],
  },
  {
    date: '6 April 2026',
    label: 'Update',
    items: [
      'Push notifications — fixed a bug where message push notifications were not being delivered to anyone. Notifications now arrive correctly on all subscribed devices',
      'Push notifications — fixed a bug where the "Your Dual just joined" notification was not firing correctly due to the same underlying issue',
      'Push notifications — stale or revoked subscriptions (e.g. when push is blocked in the browser) are now automatically cleaned up on the next notification attempt',
      'Push notifications — multiple devices are now correctly supported; each device receives notifications independently',
      'Footer — restored on desktop across all pages including Feed, Messages, Profile, and Admin',
      'Message actions — reply, edit, and delete buttons are now always visible at reduced opacity on mobile rather than hidden until long-press',
    ],
  },
  {
    date: '5 April 2026',
    label: 'Update',
    items: [
      'Verified type badges — members whose Socionics type has been professionally verified now show a ✓ on their type badge. Hover to see who verified it. Hidden in anonymous mode',
      'Verified types filter — new filter in the feed to show only members with verified types',
      'Anonymous mode — fixed an issue where members without a date of birth set could not save changes to their profile, including turning off anonymous mode. Date of birth is now optional',
      'Rate this connection — the feedback bar has moved to the top of the conversation, just below the header, so it no longer overlaps the message input',
      'Help button — repositioned consistently across all pages so it no longer overlaps the Send button in messages',
    ],
  },
  {
    date: '4 April 2026',
    label: 'Update',
    items: [
      'Help & FAQ — a ? button fixed to the bottom right of every page opens a full FAQ covering matching, relations, account settings, safety, and push notification troubleshooting by device',
      'In-app reference sheets — tapping a type badge or relation \'Learn more →\' now opens the Socionics Insight page inside Socion rather than a new tab. Works in both the feed and messages',
      'Live profile preview — Profile → Details now shows a live card that updates in real time as you edit your details',
      'Hide activity status — new toggle in Profile → Details to stop others seeing when you were last active. You won\'t appear in Online now or Active today filters while this is on',
      'Onboarding — a one-line note at the start of onboarding now tells you that a sign-in step is coming at the end, so there are no surprises',
      'Member growth chart — replaced the bar chart with a line graph with visible data points',
      'Admin dashboard — sign-ups, connections, and messages now show a +N today delta alongside the total',
    ],
  },
  {
    date: '2 April 2026',
    label: 'Update',
    items: [
      'City field — add your city in Profile → Details so others can see whether meeting up is realistic. Only your city is shown, never a postcode or exact location',
      'Location on cards — city appears alongside your country flag on feed cards',
      'Location filters — filter the feed by Anywhere, Same country, or Same city',
      'Share nudge — moved from a dismissible banner at the top of the feed to a card inline between profiles. Always visible, no dismiss needed',
      'Sign-in page — now shows your type result ("You\'re an ILI") after completing the quiz, so the context carries through to the auth wall',
      'Filters panel — the feed\'s secondary filters (profile, activity, location) are now collapsed behind a single Filters button with a badge count when active. Relation pills unchanged',
      'Support page — socion.app/support explains what the app costs to run and links to Ko-fi. Linked from the footer',
      'Delete last message — hover your last sent message to reveal a trash icon. Tap once to confirm, tap again to delete. Removes the message for both sides',
      'Edit last message — pencil icon appears alongside delete on your last sent message. Tap to edit inline, Enter to save, Escape to cancel. A subtle "· edited" label appears on the timestamp',
    ],
  },
  {
    date: '31 March 2026',
    label: 'Update',
    items: [
      'Connect modal — character counter counts down to zero as you type. Send & connect unlocks automatically at 10 characters',
      'Network graph — fullscreen mode now available on all devices, not just mobile. Button sits top-right of the graph',
      'Network graph — Spread button resets nodes to a wider circle and restarts the simulation. Disabled while the simulation is still settling',
      'Network graph — touch-action disabled on the SVG so dragging nodes on mobile no longer triggers page scroll',
      'Network page — non-logged-in visitors now see a join CTA below the graph',
      'Connections — purpose is now correctly recorded from your actual profile purpose when you connect, rather than defaulting to Dating',
    ],
  },
  {
    date: '30 March 2026',
    label: 'Update',
    items: [
      'Connect with message — a message is now required to connect with someone. Write your introduction before the connection is created',
      'Connection question — set a custom question in Profile → Details that people see before connecting with you. Falls back to a generic prompt if not set',
      'Dynamics page — each relation now shows the matching type in brackets, e.g. Dual (ESE), so you know exactly who you\'d be matched with',
      'Message box — the compose area now grows as you type. Shift + Enter inserts a new line, Enter sends',
      'Multi-line messages — line breaks in sent messages are now preserved in the conversation view',
      'Rate this connection — the feedback prompt is now more descriptive, encouraging you to help validate the theory',
      'Anonymous mode — hide your name, age, photo, and location. Your type and relation are always visible. Toggle on or off at any time in Profile → Details',
      'Known users only — new feed filter to exclude anonymous profiles',
      'Date of birth — age is now calculated from your date of birth rather than entered manually. Only your age is shown on your card, never your DOB',
      'Bio hint — bio is visible even in anonymous mode; keep it vague if you prefer privacy',
      'Push notifications fixed — multi-device delivery now works correctly across all subscriptions',
      'Privacy policy and terms updated — account self-deletion, push notifications, Google sign-in, and MailerLite all documented',
      'Network page — socion.app/network plots every connection between member types. Edge thickness shows volume, colour shows average rating. Refresh to see the latest data',
      'Homepage features section updated — anonymous mode and push notifications added as feature tiles',
    ],
  },
  {
    date: '29 March 2026',
    label: 'Update',
    items: [
      'Account deletion — delete your account permanently from Profile → Details, with confirmation step. All data, matches, and messages are removed.',
      'Sign-in link expired — if your OTP link expires, your email is pre-filled automatically and a one-tap resend button appears',
      'iOS install prompt — now correctly shown only in Safari, where Add to Home Screen is supported',
      'Spread the word — share button on the feed opens the native share sheet on mobile or copies the link on desktop',
      'Admin: sign-ups vs members — see account creations alongside completed profiles to track onboarding drop-off',
      'Admin: active 7d, inactive 7d+, and messaging 7d stat cards added',
      'Admin: mobile layout fixed — stat cards, grids, and padding all responsive on small screens',
      'Admin: analytics exclusion toggle — exclude your device from Umami tracking directly in the dashboard',
      'Discord live-stats: three notification types — new sign-up, profile complete, and new connection (with type pair)',
    ],
  },
  {
    date: '28 March 2026',
    label: 'Update',
    items: [
      'Sign-in now uses a 6-digit code instead of a magic link — more secure and works on any device including iPhone PWA',
      'Push notifications — get notified instantly when you receive a message, on any device',
      'Multi-device push — each device subscribes independently; mobile takes priority when both are active',
      'New connection push — push notification fires when someone connects with you, alongside the existing email',
      'Push notification prompt — modal appears on first visit to messages explaining the value before asking for permission',
      'Notification settings — manage email and push preferences separately in Profile → Notifications',
      'Profile split into three pages — Details, Dynamics, and Notifications, each with its own save',
      'Email notifications now respect opt-out — turn off in profile settings',
      'Email suppressed automatically when push notifications are active on your device',
      'Reply to messages — hover a message on desktop or long-press on mobile to reply with a quote',
      'Typing indicator — see when the other person is composing a message in real time',
      'Messages redesigned — fixed viewport layout on both desktop and mobile, no outer page scroll',
      'Mobile messages full width — conversation fills the screen edge to edge',
      'iOS install prompt — "Add to Home Screen" nudge for Safari users on iPhone and iPad',
      'Feed activity indicators updated — green for online now, amber for active today, brown for active this week',
      'Feed filters — Online now, Active today, and Active this week filters added with a divider separating them from relation filters',
      'Online now count shown on the feed — see how many members are active in the last 15 minutes',
      'Messages sent now shown on the home page stats',
      'Admin dashboard now shows member breakdown by country',
      'Feed purpose filtering moved server-side — faster and more accurate at scale',
      'Duplicate match prevention — database constraint ensures two users can only connect once',
    ],
  },
  {
  date: '27 March 2026',
  label: 'Update',
  items: [
    'Feed now filters by compatible types server-side — faster and accurate at any scale',
    'Feed expanded to show up to 200 profiles (was capped at 20)',
    'PWA support — Socion can now be installed to your home screen on iOS and Android',
    'Relation labels in messages now show correctly for asymmetric relations — Supervisor, Supervisee, Benefactor, and Beneficiary display from your perspective',
    'Last active indicator — green dot on profiles active today, gold for active this week',
    'Feed filters — filter by relation type, active this week, or profiles with photos',
    'Photo modal — tap a profile photo to view it full size',
    'Anonymous mode — opt in to display a 🔒 badge instead of sharing personal details',
    'Message timestamps and date dividers — Today, Yesterday, and date labels between conversation days',
    'Admin: site-wide member growth chart — cumulative signups by day',
    'Admin: site-wide feedback analysis — ratings broken down by relation type with written comments',
    'Admin: editable feed announcement — publish a dismissible banner to all users without a deploy',
    'Footer updated — links to GitHub (open source), Socionics reference, and spencerstern.com',
  ],
},
  {
    date: '26 March 2026',
    label: 'Update',
    items: [
      'Block & report — permanent block with reason reporting available from any conversation',
      'Cool off — pause messaging and feed visibility for 7 days, lifts automatically',
      'Terms of service added at socion.app/terms',
      'Google One Tap — sign in or create an account with one click, no email needed',
      'Founder badge — displayed on the feed card for the Socion team',
      'Type badges on feed cards now link to the full type profile on socionicsinsight.com',
      'Relation badges now link to the full relation page on socionicsinsight.com',
      'Type assessment data now saved — questionnaire responses recorded for research',
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
    <Layout noScroll hideFooter>
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
