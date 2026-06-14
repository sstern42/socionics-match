import { supabase } from './supabase'
import { getRelation, getMatchingTypes, sameQuadraTypes } from '../data/relations'
import { getActiveBlocks } from './blocks'

export async function getFeedProfiles({ userType, relationPreferences, userPurpose = [], currentUserId, limit = 30, offset = 0, isPremium = true }) {
  let compatibleTypes = getMatchingTypes(userType, relationPreferences)

  if (!isPremium) {
    const quadraTypes = new Set(sameQuadraTypes(userType))
    compatibleTypes = compatibleTypes.filter(t => quadraTypes.has(t))
  }

  const typeFilter = compatibleTypes.length > 0 ? compatibleTypes : ['__none__']

  let query = supabase
    .from('users')
    .select('id, type, type_confidence, profile_data, location, relation_preferences, avatar_url, purpose, last_active, verified_by, is_founding_member, plan_status')
    .neq('id', currentUserId)
    .not('profile_data', 'is', null)
    .in('type', typeFilter)
    .order('last_active', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  let countQuery = supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .neq('id', currentUserId)
    .not('profile_data', 'is', null)
    .in('type', typeFilter)

  if (userPurpose.length > 0) {
    query = query.filter('purpose', 'ov', `{${userPurpose.join(',')}}`)
    countQuery = countQuery.filter('purpose', 'ov', `{${userPurpose.join(',')}}`)
  }

  const [feedResult, blocks, swipedResult, countResult] = await Promise.all([
    query,
    getActiveBlocks(currentUserId),
    supabase.from('swipes').select('target_id').eq('swiper_id', currentUserId).eq('direction', 'left'),
    countQuery,
  ])

  if (feedResult.error) throw feedResult.error

  const rawCount = feedResult.data.length

  const blockedIds = new Set(blocks.map(b =>
    b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id
  ))

  const swipedIds = new Set(
    (swipedResult.data ?? []).map(r => r.target_id)
  )

  const profiles = feedResult.data
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

  const total = countResult.count ?? null
  return { profiles, hasMore: rawCount === limit, total }
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
