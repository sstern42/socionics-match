import { supabase } from './supabase'
import { getRelation, getMatchingTypes } from '../data/relations'
import { getActiveBlocks } from './blocks'

export async function getFeedProfiles({ userType, relationPreferences, userPurpose = [], currentUserId, limit = 200 }) {
  const compatibleTypes = getMatchingTypes(userType, relationPreferences)

  // Build query — purpose overlap filter applied server-side when userPurpose is set
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

  const [feedResult, blocks] = await Promise.all([
    query,
    getActiveBlocks(currentUserId),
  ])

  if (feedResult.error) throw feedResult.error

  const blockedIds = new Set(blocks.map(b =>
    b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id
  ))

  return feedResult.data
    .filter(profile => !blockedIds.has(profile.id))
    .map(profile => ({
      ...profile,
      relation: getRelation(userType, profile.type),
      displayRelation: getRelation(profile.type, userType),
    }))
    .filter(profile =>
      !profile.profile_data?.hidden &&
      profile.relation && relationPreferences.includes(profile.relation)
      // purpose filter now handled server-side
    )
    .slice(0, limit)
}

export async function getExistingMatches(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select('id, user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
  if (error) throw error
  return data ?? []
}

export async function createMatch({ userAId, userBId, relationType, purpose = 'dating' }) {
  const { data, error } = await supabase
    .from('matches')
    .insert({ user_a_id: userAId, user_b_id: userBId, relation_type: relationType, purpose })
    .select()
    .single()
  if (error) throw error
  window.umami?.track('connection-made', { relationType, purpose })
  return data
}
