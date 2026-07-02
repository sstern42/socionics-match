import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getPointsTotal, getPointsBreakdown } from '../../lib/points'

const TIER_LABELS = {
  regular: 'Regular',
  active: 'Active',
  core: 'Core Member',
  legend: 'Legend',
}

const ACTION_LABELS = {
  profile_complete: 'Completing your profile',
  daily_login: 'Daily logins',
  mutual_match: 'Matches made',
  message_sent: 'Messages sent',
  board_post: 'Board posts',
  board_reaction: 'Board reactions',
  room_post: 'Quadra Room posts',
  referral_qualified: 'Referrals qualified',
}

// v1 (issue #861) + phase 2 (tiers/leaderboard/breakdown). No badges/
// achievements UI or spending mechanics yet — see the issue for the
// remaining deferred list.
export default function PointsPanel({ profile }) {
  const [total, setTotal] = useState(null)
  const [tier, setTier] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [breakdown, setBreakdown] = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    getPointsTotal(profile.id).then(setTotal).catch(() => setTotal(null))
    supabase.rpc('points_tier', { p_user_id: profile.id }).then(({ data }) => setTier(data))
    supabase.rpc('get_points_leaderboard').then(({ data }) => setLeaderboard(data ?? []))
  }, [profile?.id])

  function toggleBreakdown() {
    const opening = !showBreakdown
    setShowBreakdown(opening)
    if (opening && breakdown === null && profile?.id) {
      getPointsBreakdown(profile.id).then(setBreakdown).catch(() => setBreakdown([]))
    }
  }

  if (total === null) return null

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>Points</p>
          <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)' }}>
            {total.toLocaleString()} {total === 1 ? 'point' : 'points'}
          </p>
        </div>
        {tier && (
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: 'var(--accent)', padding: '0.25rem 0.6rem', borderRadius: 3, flexShrink: 0 }}>
            {TIER_LABELS[tier]}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Earned by completing your profile, matching, messaging, and joining Boards and Quadra Rooms.{' '}
        <Link to="/help#points" style={{ color: 'var(--accent)', textDecoration: 'none' }}>How points work</Link>
      </p>

      {total > 0 && (
        <div>
          <button
            type="button"
            onClick={toggleBreakdown}
            style={{ fontSize: '0.78rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showBreakdown ? 'Hide breakdown' : 'See breakdown'}
          </button>

          {showBreakdown && (
            breakdown === null ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.6rem' }}>Loading…</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
                {breakdown.map(row => (
                  <div key={row.action_type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text)' }}>
                      {ACTION_LABELS[row.action_type] ?? row.action_type}
                      <span style={{ color: 'var(--muted)' }}> ({row.action_count.toLocaleString()})</span>
                    </span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0, marginLeft: '0.75rem' }}>
                      +{row.total_points.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {leaderboard.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Top members</p>
          <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.1rem', margin: 0 }}>
            {leaderboard.map((row, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                {row.display_name || 'A Socion member'} — {row.points_total.toLocaleString()}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
