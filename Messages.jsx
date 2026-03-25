import { supabase } from './supabase'

export async function createProfile({ authId, type, typeConfidence, profileData }) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_id: authId,
      type,
      type_confidence: typeConfidence,
      purpose: ['dating'],
      relation_preferences: [],
      profile_data: profileData,
    })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateRelationPreferences(userId, preferences) {
  const { error } = await supabase
    .from('users')
    .update({ relation_preferences: preferences })
    .eq('id', userId)
  if (error) throw error
}

export async function getProfile(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}
