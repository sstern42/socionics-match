import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { updateVisibilityFlags } from '../lib/profile'

// A gentle, snoozeable feed banner that resurfaces when a member has left a
// privacy toggle on that's quietly suppressing their reach — most often
// because they flipped it during onboarding "for a quick look around" and
// forgot. Severity-weighted: anonymous mode is a genuine footgun (hidden from
// the feed by default, never meant to be a standing state) so it earns an
// escalating reminder; hiding activity is a legitimate standing preference, so
// on its own it's mentioned once with a long back-off rather than nagged.

const SNOOZE_UNTIL_KEY = 'socion_visibility_reminder_snoozed_until'
const SNOOZE_COUNT_KEY = 'socion_visibility_reminder_snooze_count'
const DAY_MS = 24 * 60 * 60 * 1000

// Escalating snooze (days) while anonymous mode is on — resurface soon, then
// back off. Clamps to the last value.
const ANON_SNOOZE_DAYS = [3, 7, 30]
// Hide-activity on its own: one long interval, no escalation.
const ACTIVITY_ONLY_SNOOZE_DAYS = 30
// "Keep it on" — a deliberate choice, so the longest back-off.
const KEEP_SNOOZE_DAYS = 90

function isSnoozed() {
  const until = Number(localStorage.getItem(SNOOZE_UNTIL_KEY))
  return until > 0 && Date.now() < until
}

const COPY = {
  both: {
    icon: '🕵️',
    title: "You're anonymous and hiding your activity",
    body: "You're hidden from the feed by default and ranked lower — most members never see you. Make yourself visible to start showing up.",
    cta: 'Make me visible',
  },
  anon: {
    icon: '🕵️',
    title: "You're in anonymous mode",
    body: 'Anonymous profiles are hidden from the feed by default, so most members never see you. Turn it off to start showing up.',
    cta: 'Turn it off',
  },
  activity: {
    icon: '👁️',
    title: 'Your activity is hidden',
    body: "With activity hidden you rank lower in the feed and don't appear in the Online now / Active today filters.",
    cta: 'Turn it off',
  },
}

export default function VisibilityReminder() {
  const { profile, refreshProfile } = useAuth()
  const [hidden, setHidden] = useState(isSnoozed)
  const [busy, setBusy] = useState(false)

  const pd = profile?.profile_data
  const anon = !!pd?.anonymous
  const hideActivity = !!pd?.hide_activity
  const severity = anon && hideActivity ? 'both' : anon ? 'anon' : hideActivity ? 'activity' : null

  if (!profile || !severity || hidden) return null

  const copy = COPY[severity]

  async function makeVisible() {
    if (busy) return
    setBusy(true)
    try {
      await updateVisibilityFlags(profile.id, pd, { anonymous: false, hide_activity: false })
      // A fresh, visible profile has nothing to remind about — clear any snooze
      // state so a future toggle-on starts the escalation from the top.
      localStorage.removeItem(SNOOZE_UNTIL_KEY)
      localStorage.removeItem(SNOOZE_COUNT_KEY)
      await refreshProfile() // severity → null on next render, banner unmounts
    } catch {
      setBusy(false) // leave the banner up so they can retry
    }
  }

  function snooze(deliberate) {
    let days
    if (deliberate) {
      days = KEEP_SNOOZE_DAYS
    } else if (anon) {
      const count = Number(localStorage.getItem(SNOOZE_COUNT_KEY)) || 0
      days = ANON_SNOOZE_DAYS[Math.min(count, ANON_SNOOZE_DAYS.length - 1)]
      localStorage.setItem(SNOOZE_COUNT_KEY, String(count + 1))
    } else {
      days = ACTIVITY_ONLY_SNOOZE_DAYS
    }
    localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + days * DAY_MS))
    setHidden(true)
  }

  return (
    <div style={{
      border: '1px solid var(--accent-lt, var(--border))',
      borderRadius: 8,
      background: 'rgba(154,111,56,0.06)',
      padding: '0.9rem 1.1rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1.1rem', lineHeight: 1.3, flexShrink: 0 }} aria-hidden="true">{copy.icon}</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{copy.title}</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.55 }}>{copy.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={makeVisible}
            disabled={busy}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4,
              padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 500,
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit',
            }}
          >
            {busy ? 'Updating…' : copy.cta}
          </button>
          <button
            type="button"
            onClick={() => snooze(false)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
          >
            Remind me later
          </button>
          <button
            type="button"
            onClick={() => snooze(true)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.78rem', cursor: 'pointer', opacity: 0.75, fontFamily: 'inherit' }}
          >
            Keep it on
          </button>
        </div>
      </div>
    </div>
  )
}
