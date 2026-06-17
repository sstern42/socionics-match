import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TIER_LABELS = {
  connector: 'Connector',
  networker: 'Networker',
  catalyst: 'Catalyst',
  catalyst_plus: 'Catalyst+',
}

const SHARE_TEXT_TRIAL = "I'm on Socion, a Socionics-based matching app — use my link and we both get a Premium trial:"
const SHARE_TEXT_REFEREE_ONLY = "I'm on Socion, a Socionics-based matching app — use my link and you get a 7-day Premium trial:"

export default function ReferralPanel({ profile, isPremium }) {
  const [tier, setTier] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    supabase.rpc('referral_tier', { p_user_id: profile.id }).then(({ data }) => setTier(data))
    supabase.rpc('get_referral_leaderboard').then(({ data }) => setLeaderboard(data ?? []))
  }, [profile?.id])

  if (!profile?.referral_code) return null

  const link = `https://socion.app/r/${profile.referral_code}`
  const count = profile.referral_count_qualified ?? 0
  const isFoundingOrSubscriber = profile?.is_founding_member === true || profile?.plan_status === 'active' || profile?.plan_status === 'past_due'
  const shareText = isFoundingOrSubscriber ? SHARE_TEXT_REFEREE_ONLY : SHARE_TEXT_TRIAL

  function handleCopy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: shareText, url: link }).catch(() => {})
    } else {
      handleCopy()
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>Invite friends</p>
          <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)' }}>
            {isPremium
              ? `${count} ${count === 1 ? 'referral' : 'referrals'}`
              : `${count} friends joined`}
          </p>
        </div>
        {tier && (
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: 'var(--accent)', padding: '0.25rem 0.6rem', borderRadius: 3, flexShrink: 0 }}>
            {TIER_LABELS[tier]}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        {shareText}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          readOnly
          value={link}
          onFocus={e => e.target.select()}
          className="input-standalone"
          style={{ flex: 1, fontSize: '0.82rem' }}
        />
        <button type="button" className="btn-primary" onClick={handleCopy} style={{ flexShrink: 0 }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button type="button" className="btn-ghost" onClick={handleShare} style={{ flexShrink: 0 }}>
            Share
          </button>
        )}
      </div>

      {!isPremium && (
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          Each friend who joins and completes their profile earns you 30 days of Premium (up to 180 days total).
        </p>
      )}

      {(tier === 'catalyst' || tier === 'catalyst_plus' || count >= 5) && isPremium && (
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
          {count >= 10 ? 'Catalyst+ rewards (free report or 1:1)' : '50% off a typing report'} — coming soon.
        </p>
      )}

      {leaderboard.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Top connectors</p>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.1rem', margin: 0 }}>
            {leaderboard.map((row, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                {row.display_name || 'A Socion member'} — {row.referral_count_qualified}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
