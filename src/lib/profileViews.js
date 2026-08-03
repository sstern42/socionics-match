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

// Most recent distinct viewers, newest first. Dedup is client-side — the row
// per viewer we keep is their latest visit — so the two limits are different
// things and both are needed:
//
//   ROW_BUDGET   view events fetched. Caps the query itself, which was
//                previously unbounded: a heavily-viewed profile would pull
//                every row it had ever accumulated, each one joined to a users
//                row, just to collapse them down to a few dozen names.
//   VIEWER_LIMIT distinct viewers returned, applied after dedup.
//
// The budget has to exceed the viewer limit because repeat visits are spent
// out of it — log_profile_view() dedupes only within a 1-hour window, so a
// regular visitor contributes many rows. Currently ~2.1 events per viewer
// site-wide, so 10x leaves generous headroom; a profile whose viewers are
// unusually loyal returns fewer than VIEWER_LIMIT names rather than wrong
// ones, which is the safe direction to be off in.
const ROW_BUDGET   = 500
const VIEWER_LIMIT = 50

export async function getProfileViews(viewedId) {
  const { data, error } = await supabase
    .from('profile_views')
    .select('viewer_id, viewed_at, viewer:viewer_id(id, type, profile_data, avatar_url, verified_by)')
    .eq('viewed_id', viewedId)
    .order('viewed_at', { ascending: false })
    .limit(ROW_BUDGET)
  if (error) throw error
  const seen = new Set()
  const unique = (data ?? []).filter(row => {
    if (seen.has(row.viewer_id)) return false
    seen.add(row.viewer_id)
    return true
  })
  return unique.slice(0, VIEWER_LIMIT)
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
