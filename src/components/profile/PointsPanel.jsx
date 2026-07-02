import { useState, useEffect } from 'react'
import { getPointsTotal } from '../../lib/points'

// v1/MVP (issue #861): just a running total. No badges, levels, leaderboard,
// or spending mechanics yet — see the issue for the deferred list.
export default function PointsPanel({ profile }) {
  const [total, setTotal] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    getPointsTotal(profile.id).then(setTotal).catch(() => setTotal(null))
  }, [profile?.id])

  if (total === null) return null

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
      <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>Points</p>
      <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)' }}>
        {total.toLocaleString()} {total === 1 ? 'point' : 'points'}
      </p>
      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Earned by completing your profile, matching, messaging, and joining Boards and Quadra Rooms.
      </p>
    </div>
  )
}
