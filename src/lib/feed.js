import { supabase } from './supabase'
import { getRelation, getMatchingTypes, sameQuadraTypes } from '../data/relations'
import { getActiveBlocks } from './blocks'

export async function getFeedProfiles({ userType, relationPreferences, userPurpose = [], currentUserId, limit = 200, isPremium = true }) {
  let compatibleTypes = getMatchingTypes(userType, relationPreferences)

  // Free-tier gate: restrict the feed to same-quadra types only.
  // Same quadra produces the Identity / Dual / Activity / Mirror relations.
  // Premium and founding members (isPremium === true) see all 16.
  // Default is true so callers that don't pass the flag keep the full feed —
  // gating only kicks in where isPremium is explicitly passed as false.
  if (!isPremium) {
    const quadraTypes = new Set(sameQuadraTypes(userType))
    compatibleTypes = compatibleTypes.filter(t => quadraTypes.has(t))
  }

  let query = supabase
    .from('users')
    .select('id, type, type_confidence, profile_data, location, relation_preferences, avatar_url, purpose, last_active, verified_by')
    .neq('id', currentUserId)
    .not('profile_data', 'is', null)
    .in('type', compatibleTypes.length > 0 ? compatibleTypes : ['__none__'])
    .order('last_active', { ascending: false, nullsFirst: false })
    .limit(200)

  if (userPurpose.length > 0) {
    query = query.filter('purpose', 'ov', `{${userPurpose.join(',')}}`)
  }

  const [feedResult, blocks, swipedResult] = await Promise.all([
    query,
    getActiveBlocks(currentUserId),
    supabase.from('already_swiped').select('swiped_profile_id'),
  ])

  if (feedResult.error) throw feedResult.error

  const blockedIds = new Set(blocks.map(b =>
    b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id
  ))

  const swipedIds = new Set(
    (swipedResult.data ?? []).map(r => r.swiped_profile_id)
  )

  return feedResult.data
    .filter(profile => !blockedIds.has(profile.id))
    .filter(profile => !swipedIds.has(profile.id))
    .map(profile => ({
      ...profile,
      relation:        getRelation(userType, profile.type),
      displayRelation: getRelation(profile.type, userType),
    }))
    .filter(profile =>
      !profile.profile_data?.hidden &&
      profile.relation && relationPreferences.includes(profile.relation)
    )
    .slice(0, limit)
}

// Only live (non-unmatched) matches. This drives both the free-tier cap count
// (Object.keys(matchedMap).length) and whether a profile shows "Message" vs
// "Connect" in the feed — so unmatching frees a slot AND lets that person
// reappear as connectable. The DB unmatch is a soft-delete; the row still
// exists with unmatched_at set, but it no longer counts here.
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
  // Reconnecting a previously-unmatched pair revives the original row (keeps
  // the thread + history continuous and avoids the duplicate-match constraint
  // tripping on the soft-deleted row). revive_match returns the revived id, or
  // null if there's nothing to revive — in which case we insert fresh.
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
    return data
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({ user_a_id: userAId, user_b_id: userBId, relation_type: relationType, purpose })
    .select()
    .single()
  if (error) throw error
  window.umami?.track('connection-made', { relationType, purpose })
  return data
}
