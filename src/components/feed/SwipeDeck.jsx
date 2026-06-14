import { useState, useCallback, useEffect } from 'react'
import SwipeCard from './SwipeCard'
import { supabase } from '../../lib/supabase'
import { getRelation } from '../../data/relations'

// How many cards to render in the stack (top card + 2 behind)
const VISIBLE_COUNT = 3

// Visual offsets for cards behind the top
const STACK = [
  { zIndex: 30, transform: 'none' },
  { zIndex: 20, transform: 'scale(0.96) translateY(14px)' },
  { zIndex: 10, transform: 'scale(0.92) translateY(28px)' },
]

export default function SwipeDeck({ profiles, currentUserId, userType, onMatch, blockRightSwipe = false, onBlockedRightSwipe, initialSwiped, onSwipeComplete }) {
  const [swiped, setSwiped] = useState(() => new Set(initialSwiped ?? []))
  const [queue, setQueue]   = useState(() => {
    const seen = new Set(initialSwiped ?? [])
    return profiles.filter(p => !seen.has(p.id))
  })

  // Sync queue if parent refreshes profiles (e.g. loadMore)
  useEffect(() => {
    setQueue(prev => {
      const prevIds = new Set(prev.map(p => p.id))
      const newProfiles = profiles.filter(p => !swiped.has(p.id) && !prevIds.has(p.id))
      return [...prev.filter(p => profiles.some(fp => fp.id === p.id)), ...newProfiles]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles])

  const handleSwipe = useCallback(async (direction, profile) => {
    if (direction === 'right' && blockRightSwipe) {
      onBlockedRightSwipe?.()
      return
    }

    const relationType = getRelation(userType, profile.type)

    // Remove from deck immediately for snappy UX
    setSwiped(prev => new Set([...prev, profile.id]))
    setQueue(prev => prev.filter(p => p.id !== profile.id))
    onSwipeComplete?.(profile.id)

    // Record swipe in Supabase
    const { error } = await supabase.from('swipes').insert({
      swiper_id:     currentUserId,
      target_id:     profile.id,
      direction,
      relation_type: relationType ?? null,
    })

    if (error) {
      console.error('Swipe insert failed:', error)
      return
    }

    window.umami?.track('swipe', { direction, relationType: relationType ?? 'unknown' })

    if (direction === 'right') {
      // Use SECURITY DEFINER RPC to check reciprocal swipe — direct table query
      // is blocked by RLS (swipes_select_own only allows reading your own rows)
      const { data: hasMatch } = await supabase
        .rpc('has_swiped_right', {
          p_swiper_id: profile.id,
          p_target_id: currentUserId,
        })

      if (hasMatch) {
        const { data: matchRow } = await supabase
          .from('matches')
          .select('id')
          .or(
            `and(user_a_id.eq.${currentUserId},user_b_id.eq.${profile.id}),` +
            `and(user_a_id.eq.${profile.id},user_b_id.eq.${currentUserId})`
          )
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        window.umami?.track('swipe-mutual-match', { relationType: relationType ?? 'unknown' })
        onMatch?.({ profile, relationType, matchId: matchRow?.id ?? null })
      }
    }
  }, [currentUserId, userType, onMatch, blockRightSwipe, onBlockedRightSwipe, onSwipeComplete])

  // Skip — move top profile to the back of the current queue, session-only, no DB write
  const handleSkip = useCallback((profile) => {
    setQueue(prev => {
      const rest = prev.filter(p => p.id !== profile.id)
      return [...rest, profile]
    })
    window.umami?.track('swipe-skipped', { type: profile.type })
  }, [])

  const visible = queue.slice(0, VISIBLE_COUNT)

  if (visible.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '1rem', padding: '3rem 1.5rem',
        textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--muted)' }}>
          You've seen everyone for now.
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, maxWidth: 280 }}>
          New members join every day. Check back later or broaden your relation preferences.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 420,
      margin: '0 auto',
      height: 'min(calc(100vh - 200px), 620px)',
      paddingBottom: 40,
      touchAction: 'none',
    }}>
      {[...visible].reverse().map((profile, reverseIdx) => {
        const idx        = visible.length - 1 - reverseIdx
        const isTop      = idx === 0
        const stackEntry = STACK[idx] ?? STACK[STACK.length - 1]

        return (
          <SwipeCard
            key={profile.id}
            profile={profile}
            isTop={isTop}
            zIndex={stackEntry.zIndex}
            stackTransform={stackEntry.transform}
            blockRightSwipe={blockRightSwipe}
            onBlockedRightSwipe={onBlockedRightSwipe}
            onSwipe={(direction) => handleSwipe(direction, profile)}
            onSkip={isTop ? () => handleSkip(profile) : undefined}
          />
        )
      })}
    </div>
  )
}
