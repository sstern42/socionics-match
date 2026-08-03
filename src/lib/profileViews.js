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

// Distinct viewers, all time — deliberately unwindowed, to match
// getProfileViews() above, which never filtered by date either. The count used
// to look back 7 days while the list it links to (the sidebar card navigates
// to ?tab=views) showed everything, so a premium member could read "Profile
// viewers 0" and click through to a list of 19 people. At current volume a
// 7-day window also reads 0 on a normal week for most members, which is
// accurate and useless in equal measure.
//
// Both callers label this "viewers" / "people have viewed your profile", and
// log_profile_view() only dedupes within a 1-hour window, so counting rows
// would report one repeat visitor as several people.
//
// Avoid head:true — known issues with count + RLS on some Supabase client versions.
// Errors are thrown rather than swallowed: returning 0 on failure is
// indistinguishable from a genuine zero, which is how a missing table grant
// masqueraded as "Profile viewers 0" for every member until
// 20260803130000_profile_views_grants.sql. Callers render '—' when the query
// fails, so a broken read now looks broken.
export async function getProfileViewCount(viewedId) {
  const { data, error } = await supabase
    .from('profile_views')
    .select('viewer_id')
    .eq('viewed_id', viewedId)
  if (error) throw error
  return new Set((data ?? []).map(row => row.viewer_id)).size
}
