import { supabase } from './supabase'
import { getRelation, getMatchingTypes, sameQuadraTypes } from '../data/relations'
import { getActiveBlocks } from './blocks'
import { awardPoints } from './points'

export async function getFeedProfiles({ userType, relationPreferences, userPurpose = [], currentUserId, limit = 30, offset = 0, isPremium = true }) {
  let compatibleTypes = getMatchingTypes(userType, relationPreferences)

  if (!isPremium) {
    const quadraTypes = new Set(sameQuadraTypes(userType))
    compatibleTypes = compatibleTypes.filter(t => quadraTypes.has(t))
  }

  // Blocked / swiped / hidden exclusion now happens server-side (see migration
  // 20260704140000_get_feed_profiles_rpc.sql) so `total` and `hasMore` agree
  // with the returned page by construction. An empty p_types simply returns no
  // rows. Relation logic stays here: p_types is already narrowed by relation
  // preference (and premium quadra scope) via getMatchingTypes above.
  const purposeArg = userPurpose.length > 0 ? userPurpose : null

  const [pageResult, typeCountsResult, allSwipedResult] = await Promise.all([
    supabase.rpc('get_feed_profiles', {
      p_types: compatibleTypes,
      p_purpose: purposeArg,
      p_limit: limit,
      p_offset: offset,
    }),
    supabase.rpc('get_feed_type_counts', {
      p_types: compatibleTypes,
      p_purpose: purposeArg,
    }),
    // Still fetched so the client can seed swipedIdsRef for immediate in-session
    // dedup after a swipe (before the next refetch). The server page already
    // excludes these rows, so this is belt-and-braces, not the primary filter.
    supabase.from('swipes').select('target_id').eq('swiper_id', currentUserId),
  ])

  if (pageResult.error) throw pageResult.error

  const rows = pageResult.data ?? []
  // count(*) over() rides on every page row; an empty page means zero visible.
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0

  const profiles = rows.map(({ profile }) => ({
    ...profile,
    relation:        getRelation(userType, profile.type),
    displayRelation: getRelation(profile.type, userType),
  }))

  const allSwipedIds = new Set((allSwipedResult.data ?? []).map(r => r.target_id))

  const relationCounts = {}
  for (const row of (typeCountsResult.data ?? [])) {
    const rel = getRelation(row.type, userType)
    if (rel) relationCounts[rel] = (relationCounts[rel] || 0) + Number(row.cnt)
  }

  return { profiles, hasMore: offset + profiles.length < total, total, allSwipedIds, relationCounts }
}

export async function getQuadraOnline({ userType, currentUserId, limit = 8 }) {
  const quadraTypes = sameQuadraTypes(userType)
  if (quadraTypes.length === 0) return []

  const [usersResult, blocks] = await Promise.all([
    supabase
      .from('users')
      .select('id, type, profile_data, avatar_url, last_active')
      .neq('id', currentUserId)
      .not('profile_data', 'is', null)
      .in('type', quadraTypes)
      .order('last_active', { ascending: false, nullsFirst: false })
      .limit(limit),
    getActiveBlocks(currentUserId),
  ])

  if (usersResult.error) throw usersResult.error

  const blockedIds = new Set(blocks.map(b =>
    b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id
  ))

  return usersResult.data
    .filter(u => !blockedIds.has(u.id))
    .filter(u => !u.profile_data?.hidden)
}

export async function getExistingMatches(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select('id, user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .is('unmatched_at', null)
  if (error) throw error
  return data ?? []
}

export async function createMatch({ userAId, userBId, relationType, purpose = 'dating' }) {
  const { data: revivedId, error: reviveErr } = await supabase.rpc('revive_match', {
    p_user_a: userAId,
    p_user_b: userBId,
    p_relation_type: relationType,
    p_purpose: purpose,
  })
  if (reviveErr) throw reviveErr

  if (revivedId) {
    const { data, error } = await supabase
      .from('matches')
      .select()
      .eq('id', revivedId)
      .single()
    if (error) throw error
    window.umami?.track('connection-revived', { relationType, purpose })
    awardPoints(userAId, 'mutual_match', data.id)
    awardPoints(userBId, 'mutual_match', data.id)
    return data
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({ user_a_id: userAId, user_b_id: userBId, relation_type: relationType, purpose })
    .select()
    .single()
  if (error) throw error
  window.umami?.track('connection-made', { relationType, purpose })
  awardPoints(userAId, 'mutual_match', data.id)
  awardPoints(userBId, 'mutual_match', data.id)
  return data
}
