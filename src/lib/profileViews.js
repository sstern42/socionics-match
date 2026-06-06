import { supabase } from './supabase'

export async function logProfileView(viewerId, viewedId) {
  if (!viewerId || !viewedId || viewerId === viewedId) return
  try {
    await supabase.rpc('log_profile_view', {
      p_viewer: viewerId,
      p_viewed: viewedId,
    })
  } catch {
    // Non-fatal
  }
}

export async function getProfileViews(viewedId) {
  const { data, error } = await supabase
    .from('profile_views')
    .select('viewer_id, viewed_at, viewer:viewer_id(id, type, profile_data, avatar_url, verified_by)')
    .eq('viewed_id', viewedId)
    .order('viewed_at', { ascending: false })
  if (error) throw error
  const seen = new Set()
  return (data ?? []).filter(row => {
    if (seen.has(row.viewer_id)) return false
    seen.add(row.viewer_id)
    return true
  })
}

// Avoid head:true — known issues with count + RLS on some Supabase client versions
export async function getProfileViewCount(viewedId) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data, error } = await supabase
    .from('profile_views')
    .select('id')
    .eq('viewed_id', viewedId)
    .gt('viewed_at', since)
  if (error) return 0
  return (data ?? []).length
}
