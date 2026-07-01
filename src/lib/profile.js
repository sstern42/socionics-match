import { supabase } from './supabase'

// True when `err` is the display-name collision raised by
// enforce_unique_display_name() (supabase/migrations/20260701120000_display_name_uniqueness.sql).
// Callers use this to show a friendly message instead of the raw trigger error.
export function isDuplicateNameError(err) {
  return err?.code === '23505' && /display_name_taken/.test(err?.message ?? '')
}

export const DUPLICATE_NAME_MESSAGE = 'That display name is already taken — please choose another.'

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

// Additional gallery photos. Unlike the avatar (fixed path, overwritten), each
// gallery photo gets a unique path so multiple can coexist. Returns the public
// URL to store in users.photos.
export async function uploadPhoto(authId, file) {
  const ext = file.name.split('.').pop()
  const path = `${authId}/photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

// Remove a gallery photo from storage. Tolerant of failure — the URL is also
// dropped from users.photos by the caller regardless, so a storage miss never
// blocks the UI. Strips the cache-busting query and derives the storage path
// from the public URL.
export async function deletePhoto(url) {
  try {
    const clean = url.split('?')[0]
    const marker = '/avatars/'
    const idx = clean.indexOf(marker)
    if (idx === -1) return
    const path = clean.slice(idx + marker.length)
    await supabase.storage.from('avatars').remove([path])
  } catch (err) {
    console.error('Failed to delete photo from storage:', err)
  }
}

export async function updateProfileData(userId, { profileData, type, avatarUrl, photos }) {
  const updates = { profile_data: profileData, type }
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl
  if (photos !== undefined) updates.photos = photos
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
