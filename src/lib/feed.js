import { supabase } from './supabase'
import { getRelation, getMatchingTypes } from '../data/relations'
import { getActiveBlocks } from './blocks'

export async function getFeedProfiles({ userType, relationPreferences, userPurpose = [], currentUserId, limit = 200 }) {
  const compatibleTypes = getMatchingTypes(userType, relationPreferences)

  const [feedResult, blocks] = await Promise.all([
    supabase
      .from('users')
      .select('id, type, type_confidence, profile_data, location, relation_preferences, avatar_url, purpose')
      .neq('id', currentUserId)
      .not('profile_data', 'is', null)
      .in('type', compatibleTypes.length > 0 ? compatibleTypes : ['__none__'])
      .limit(200),
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
      profile.relation && relationPreferences.includes(profile.relation) &&
      (userPurpose.length === 0 || (profile.purpose ?? []).some(p => userPurpose.includes(p)))
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
  return data
}
