import { supabase } from './supabase'
import { getRelation } from '../data/relations'

export async function getFeedProfiles({ userType, relationPreferences, currentUserId, limit = 20 }) {
  const { data, error } = await supabase
    .from('users')
    .select('id, type, type_confidence, profile_data, location, relation_preferences')
    .neq('id', currentUserId)
    .not('profile_data', 'is', null)
    .limit(100)

  if (error) throw error

  return data
    .map(profile => ({
      ...profile,
      // relation = YOUR role (used for filtering against your preferences)
      relation: getRelation(userType, profile.type),
      // displayRelation = THEIR role relative to you (shown on the card)
      displayRelation: getRelation(profile.type, userType),
    }))
    .filter(profile =>
      profile.relation && relationPreferences.includes(profile.relation)
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
