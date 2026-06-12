import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { usePageTitle } from '../hooks/usePageTitle'

const FAQS = [
  {
    section: 'Typing & your type',
    items: [
      {
        q: "What if I don't know my type?",
        a: "No problem — Socion includes a short questionnaire that will suggest your most likely type. It's not perfect, but it's a good starting point. You can always change your type later as you learn more about Socionics.",
      },
      {
        q: 'Can I change my type after signing up?',
        a: "Yes. Go to Profile → Details and update your type at any time. If you want a considered, reasoned answer, the Get Typed service provides a typing report and updates your profile to match.",
      },
      {
        q: 'How accurate is the typing questionnaire?',
        a: "It's a reasonable first approximation — better than most online tests. That said, Socionics typing is genuinely difficult and self-report has limits. Treat the result as a starting point rather than a definitive answer.",
      },
      {
        q: "What's the difference between Socionics and MBTI?",
        a: "They share the same 16-type structure and Jungian roots, but Socionics is primarily a theory of relationships rather than individual traits. The type names differ slightly, and crucially, Socionics maps a specific named dynamic between every possible pair of types. MBTI doesn't do this. The two systems also differ on how some types are defined — introverted types in particular don't map cleanly between the two.",
      },
    ],
  },
  {
    section: 'Get typed',
    items: [
      {
        q: 'What is the Get Typed service?',
        a: 'Get Typed is a marketplace of Socionics typists — each with their own method, pricing, and availability. You choose a typist, pay securely via Stripe, and receive a considered read on your type with your Socion profile updated to match.',
      },
      {
        q: 'How does it work?',
        a: 'Browse the typists on the Get Typed page and choose one that suits you. Each typist has their own method — some work via a written questionnaire, others via voice call on Discord. After payment you are taken through their process, and your report or session outcome is delivered within the timeframe they specify.',
      },
      {
        q: 'How much does it cost?',
        a: 'Pricing varies by typist and tier. Written report sessions start from $29. Each typist sets their own rates, which are shown clearly on their profile before you book.',
      },
      {
        q: 'How long does the questionnaire take?',
        a: "For written report typists, most people take 20–30 minutes. There are twelve questions and you answer in your own words — two or three honest sentences each is plenty. You can take as long as you like; there's no timer. Voice-based typists will discuss their session format on their profile page.",
      },
      {
        q: 'How is the report delivered?',
        a: "Written reports are delivered by email, typically running 3,500–5,000 words and covering your type, the reasoning behind it, and what it means for the relations that fit you. Voice-based typists may deliver a summary separately — check their profile for details.",
      },
      {
        q: 'Is fluent English required?',
        a: 'The questionnaire and written reports are in English, so a good working level of written English helps. Voice sessions require spoken English. You answer in your own time for written reports, so there is no live pressure involved.',
      },
      {
        q: 'What happens to my Socion profile?',
        a: 'Once your typing is complete, your Socion type is updated to match and a confirmed marker is added to your profile, so your feed and compatibility breakdowns reflect the right type.',
      },
      {
        q: 'What if my report says my type is uncertain?',
        a: "If the evidence is genuinely split, the report says so honestly — naming the most likely candidates and explaining what distinguishes them — rather than forcing a single answer. A frank 'between these two' is more useful than false certainty, and you're welcome to reply with anything that might resolve it.",
      },
    ],
  },
  {
    section: 'Matching & connections',
    items: [
      {
        q: 'How does the matching work?',
        a: "Socion matches you based on your Socionics type and the relation types you're open to. Every pair of types produces one of 16 named dynamics — Dual, Mirror, Activity, Conflict, and so on. You choose which dynamics you want to connect with, and Socion surfaces people whose type produces that dynamic with yours.",
      },
      {
        q: "Why can I see some types but not others in my feed?",
        a: "On the free tier, your feed shows members in the same quadra as your type. Premium unlocks all 16 relation type filters across the full feed. If a type still isn't appearing, either no active members of that type are currently on the platform, or your relation preferences are filtering them out. You can adjust your relation preferences in Profile → Details.",
      },
      {
        q: 'What happens when I connect with someone?',
        a: 'Connecting opens a private message thread between you and the other person. The relation type is displayed in the conversation so you both know the dynamic you\'re working with.',
      },
      {
        q: 'Can I disconnect from someone?',
        a: "Yes. Open the conversation, tap the ··· menu, and choose Disconnect. This ends the connection for both of you and frees up a connection slot — your message history isn't deleted, but neither of you can send new messages unless you reconnect. If you want to stop someone contacting you entirely, use Block instead, which is permanent.",
      },
    ],
  },
  {
    section: 'Intertype relations',
    items: [
      {
        q: 'What do the relation types mean?',
        a: "Each of the 16 relation types has a distinct character — some are complementary, some stimulating, some challenging. Tap the relation badge on any profile card to read about it, or browse the full library at socionicsinsight.com/relations/.",
      },
      {
        q: 'Why would I want to connect with a Conflict type?',
        a: "Some people are curious about challenging dynamics, or want to understand them better. Socion doesn't tell you who to connect with — it gives you the information and lets you decide. Some find value in every relation type depending on context and purpose.",
      },
      {
        q: 'Can I filter by specific relation types?',
        a: "Yes — go to Profile → Details and select the relation types you're open to. Premium members can filter across all 16 relation types. Free members see same-quadra matches by default.",
      },
    ],
  },
  {
    section: 'Account & profile',
    items: [
      {
        q: 'How do I change my purpose?',
        a: "Go to Profile → Details. You can update your purpose — dating, friendship, networking, or team building — at any time. Your feed will reflect the change immediately.",
      },
      {
        q: 'Can I use Socion anonymously?',
        a: "Yes. Enable anonymous mode in Profile → Details. In anonymous mode your name and photo are hidden from other users. You can still connect and message — others just won't see your identity until you choose to reveal it.",
      },
      {
        q: 'How do I delete my account?',
        a: "Go to Profile → Details and scroll to the bottom. There is a delete account option. Deletion is permanent and removes all your data including messages and connections.",
      },
    ],
  },
  {
    section: 'Safety',
    items: [
      {
        q: 'How do I block or report someone?',
        a: "Open their profile card and tap the menu. You can block or report from there. Blocking ends all contact immediately.",
      },
      {
        q: 'What happens after I report someone?',
        a: "Reports are reviewed by the Socion founder. If a report is upheld the user may be issued a cool-off or removed from the platform.",
      },
      {
        q: 'What is a cool-off?',
        a: "A temporary restriction applied when a user has behaved in a way that breaches community standards. During a cool-off the user cannot connect or message. It expires automatically after 7 days.",
      },
    ],
  },
  {
    section: 'Premium & pricing',
    items: [
      {
        q: 'Is Socion free?',
        a: "Socion has a free tier and a paid premium tier. The free tier gives you up to 3 connections and shows same-quadra matches. Premium is $14.99/year and unlocks unlimited connections, all 16 relation type filters, full Model A compatibility breakdowns for every connection, and sender-side read receipts.",
      },
      {
        q: 'What is a founding member?',
        a: "Members who joined Socion before 16 June 2026 are founding members. Founding members have permanent free premium access — all premium features, forever, at no cost. It's a thank-you for being early.",
      },
      {
        q: 'How do I upgrade to Premium?',
        a: "Go to the Premium page from the footer or your profile. Payment is handled securely via Stripe. Once your payment is confirmed, premium features are available immediately.",
      },
      {
        q: 'What happens if my premium subscription lapses?',
        a: "Nothing is deleted and no existing connections are severed. Your message history is fully retained. Premium features simply gate new actions — you won't be able to add connections beyond 3 or filter outside your quadra until you re-subscribe.",
      },
      {
        q: 'Can I cancel at any time?',
        a: "Yes. You can cancel via the Stripe customer portal, linked from your settings. Your premium access runs to the end of the billing period you've already paid for.",
      },
    ],
  },
  {
    section: 'The app',
    items: [
      {
        q: 'Is my data private?',
        a: "Your profile is only visible to other signed-in Socion members. Your data is stored securely on Supabase servers in the EU. Socion does not sell or share your data with third parties.",
      },
      {
        q: 'How do I install Socion to my home screen?',
        a: "On iPhone, you must use Safari — Chrome and other iOS browsers don't support home screen installation. Open socion.app in Safari, tap the Share button, then \"Add to Home Screen.\" On Android: open socion.app in Chrome, tap the three-dot menu, then \"Add to Home Screen\" or \"Install app.\"",
      },
      {
        q: 'Push notifications not working?',
        a: null,
        isNotifications: true,
      },
    ],
  },
]

const NOTIFICATIONS_CONTENT = [
  {
    heading: 'iPhone / iPad (Safari)',
    body: `Notifications require Safari and Socion installed to your home screen. Chrome, Firefox, and in-app browsers on iPhone do not support either.

1. Open socion.app in Safari (not Chrome or any other app)
2. Tap the Share button (the box with an arrow)
3. Tap "Add to Home Screen"
4. Open Socion from your home screen
5. Go to Messages — a prompt to enable notifications will appear automatically

Already installed but still not working? Safari may have blocked the permission:

1. Open the Settings app
2. Scroll down to Safari → Settings for Websites → Notifications
3. Find socion.app and set it to Allow
4. Reopen Socion from your home screen and go to Messages — the prompt will reappear`,
  },
  {
    heading: 'Android (Chrome)',
    body: `1. Open Chrome and go to Settings → Site settings → Notifications
2. Find socion.app and set it to Allow
3. Return to Socion, go to Profile → Notifications and tap Enable`,
  },
  {
    heading: 'Desktop (Chrome / Edge)',
    body: `1. Click the padlock icon in the address bar
2. Find Notifications and set it to Allow
3. Refresh the page, go to Profile → Notifications and click Enable`,
  },
  {
    heading: 'Desktop (Firefox)',
    body: `1. Click the padlock icon in the address bar
2. Click "Connection secure" → More information → Permissions
3. Find "Send notifications" and remove the block
4. Refresh and try enabling again`,
  },
]

function FAQItem({ q, a, isNotifications }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '1rem 0', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>{q}</span>
        <span style={{ fontSize: '1rem', color: 'var(--muted)', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: '1.25rem' }}>
          {isNotifications ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {NOTIFICATIONS_CONTENT.map(({ heading, body }) => (
                <div key={heading}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>{heading}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{body}</p>
                </div>
              ))}
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.7, paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                Still not working? Drop a message in the{' '}
                <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Discord</a>
                {' '}and describe your device and browser — we'll help you get it sorted.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.8 }}>{a}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Help() {
  usePageTitle('Help')
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.replace('#', ''))
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [hash])

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Help & <em>FAQ</em>
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '3rem' }}>
          Common questions about Socion. Can't find what you're looking for?{' '}
          <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Ask in the Discord</a>.
        </p>

        {FAQS.map(({ section, items }) => (
          <div key={section} id={section === 'The app' ? 'notifications' : undefined} style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.25rem' }}>
              {section}
            </p>
            {items.map(item => (
              <FAQItem key={item.q} {...item} />
            ))}
          </div>
        ))}

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Socion is built by{' '}
            <a href="https://spencerstern.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Spencer Stern</a>
            {' · '}
            <a href="mailto:hello@socion.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>hello@socion.app</a>
            {' · '}
            <Link to="/support" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Support Socion ☕</Link>
          </p>
        </div>
      </section>
    </Layout>
  )
}
