import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { setMarketingPreference, MARKETING_SOURCES } from '../lib/emailPreferences'

// One-time, non-blocking ask for members who joined before sign-up captured
// marketing consent (users.marketing_opt_in IS NULL). Either answer is
// recorded and the banner never returns. Closing it without answering leaves
// the preference NULL and hides it for the rest of this browser session, so
// it's asked at most once per session.
//
// Wording is archived in docs/policies/consent-text-v1.md.

const DISMISSED_KEY = 'socion_marketing_prompt_dismissed'

// Pages that already cover this, or where a banner would get in the way.
const HIDDEN_ON = ['/profile/setup', '/profile/notifications', '/auth', '/unsubscribe']

function wasDismissed() {
  try { return sessionStorage.getItem(DISMISSED_KEY) === '1' } catch { return false }
}

export default function MarketingConsentPrompt() {
  const { profile, refreshProfile } = useAuth()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Strict null: undefined means the column isn't there yet (frontend deployed
  // ahead of the migration), and asking then would fail on answer.
  if (!profile || profile.marketing_opt_in !== null || dismissed) return null
  if (HIDDEN_ON.some(p => pathname.startsWith(p))) return null

  async function answer(optIn) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await setMarketingPreference(optIn, MARKETING_SOURCES.inAppPrompt)
      await refreshProfile() // marketing_opt_in is no longer null → unmounts
    } catch {
      setError("Couldn't save that. Please try again.")
      setBusy(false)
    }
  }

  function dismiss() {
    try { sessionStorage.setItem(DISMISSED_KEY, '1') } catch { /* private mode */ }
    setDismissed(true)
  }

  return (
    <div role="region" aria-label="Email updates" style={{ padding: '0.75rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%',
        maxWidth: 640,
        border: '1px solid var(--accent-lt, var(--border))',
        borderRadius: 8,
        background: 'rgba(154,111,56,0.06)',
        padding: '0.9rem 1.1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}>
        <span style={{ fontSize: '1.1rem', lineHeight: 1.3, flexShrink: 0 }} aria-hidden="true">📬</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>Want occasional Socion updates by email?</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.55 }}>
            News about new features and the community, a few times a year at most. You can change this any time in Settings.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => answer(true)}
              disabled={busy}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4,
                padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 500,
                cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit',
              }}
            >
              Yes, send me updates
            </button>
            <button
              type="button"
              onClick={() => answer(false)}
              disabled={busy}
              style={{
                background: 'none', border: 'none', padding: 0, fontSize: '0.78rem', color: 'var(--muted)',
                cursor: busy ? 'default' : 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
              }}
            >
              No thanks
            </button>
          </div>
          {error && <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.5rem' }}>{error}</p>}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ask me later"
          title="Ask me later"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', flexShrink: 0, lineHeight: 1 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="2" x2="12" y2="12"/>
            <line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
