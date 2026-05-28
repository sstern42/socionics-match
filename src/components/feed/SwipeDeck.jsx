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

export default function SwipeDeck({ profiles, currentUserId, userType, onMatch, blockRightSwipe = false, onBlockedRightSwipe }) {
  const [queue, setQueue]   = useState([...profiles])
  const [swiped, setSwiped] = useState(new Set())

  // Sync queue if parent refreshes profiles
  useEffect(() => {
    setQueue(profiles.filter(p => !swiped.has(p.id)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles])

  const handleSwipe = useCallback(async (direction, profile) => {
    // Free-tier cap backstop: an at-cap right-swipe is stopped before anything
    // is recorded or removed from the deck. SwipeCard already gates this at the
    // gesture / button, so reaching here on a blocked right is belt-and-braces.
    if (direction === 'right' && blockRightSwipe) {
      onBlockedRightSwipe?.()
      return
    }

    const relationType = getRelation(userType, profile.type)

    // Remove from deck immediately for snappy UX
    setSwiped(prev => new Set([...prev, profile.id]))
    setQueue(prev => prev.filter(p => p.id !== profile.id))

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

    // On a right-swipe, check for mutual match
    // The DB trigger already inserts into matches — we just need to detect
    // it for the UI and pass back the match details.
    if (direction === 'right') {
      const { data: reverseSwipe } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', profile.id)
        .eq('target_id', currentUserId)
        .eq('direction', 'right')
        .maybeSingle()

      if (reverseSwipe) {
        // Mutual — fetch the newly created match row for the match ID
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
  }, [currentUserId, userType, onMatch, blockRightSwipe, onBlockedRightSwipe])

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
    // Outer wrapper: fixed height with bottom padding for the button row breathing room
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 420,
      margin: '0 auto',
      // Height adapts: fills available space up to a comfortable card height.
      // The extra 40px bottom padding accounts for the card stack peek effect.
      height: 'min(calc(100vh - 200px), 620px)',
      paddingBottom: 40,
    }}>
      {/*
        Render in reverse order so the top card (index 0) is painted last
        and receives pointer events correctly.
      */}
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
          />
        )
      })}
    </div>
  )
}
