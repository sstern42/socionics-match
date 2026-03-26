import { supabase } from './supabase'

export async function createProfile({ authId, type, typeConfidence, profileData, purpose = ['dating'] }) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_id: authId,
      type,
      type_confidence: typeConfidence,
      purpose,
      relation_preferences: [],
      profile_data: profileData,
    })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function uploadAvatar(authId, file) {
  const ext = file.name.split('.').pop()
  const path = `${authId}/avatar.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Bust cache by appending timestamp
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function updateProfileData(userId, { profileData, type, avatarUrl }) {
  const updates = { profile_data: profileData, type }
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}

export async function updatePurpose(userId, purpose) {
  const { error } = await supabase
    .from('users')
    .update({ purpose })
    .eq('id', userId)
  if (error) throw error
}

export async function updateRelationPreferences(userId, preferences) {
  const { error } = await supabase
    .from('users')
    .update({ relation_preferences: preferences })
    .eq('id', userId)
  if (error) throw error
}

export async function createTypeAssessment({ userId, responses, typeDistribution }) {
  const { error } = await supabase
    .from('type_assessments')
    .insert({
      user_id: userId,
      responses,
      computed_type_distribution: typeDistribution,
      version: 'slide-1.0',
    })
  if (error) console.error('Failed to save type assessment:', error)
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
