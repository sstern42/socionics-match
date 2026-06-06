import { supabase } from './supabase'

/**
 * Log a profile view. Silent — never throws, never blocks UI.
 * Deduplication within a 1-hour window is handled server-side.
 */
export async function logProfileView(viewerId, viewedId) {
  if (!viewerId || !viewedId || viewerId === viewedId) return
  try {
    await supabase.rpc('log_profile_view', {
      p_viewer: viewerId,
      p_viewed: viewedId,
    })
  } catch {
    // Non-fatal — silently discard
  }
}

/**
 * Fetch viewer rows for the profile owner.
 * Returns one row per unique viewer, keeping the most recent visit.
 * Sorted by recency (newest first).
 *
 * @param {string} viewedId - The profile owner's user ID
 * @returns {Array} Deduped viewer rows with joined viewer profile data
 */
export async function getProfileViews(viewedId) {
  const { data, error } = await supabase
    .from('profile_views')
    .select('viewer_id, viewed_at, viewer:viewer_id(id, type, profile_data, avatar_url, verified_by)')
    .eq('viewed_id', viewedId)
    .order('viewed_at', { ascending: false })
  if (error) throw error

  // Deduplicate: one row per viewer, most recent visit wins
  const seen = new Set()
  return (data ?? []).filter(row => {
    if (seen.has(row.viewer_id)) return false
    seen.add(row.viewer_id)
    return true
  })
}

/**
 * 7-day rolling count — for free-tier tease.
 * @param {string} viewedId
 * @returns {number}
 */
export async function getProfileViewCount(viewedId) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const { count, error } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('viewed_id', viewedId)
    .gt('viewed_at', since)
  if (error) return 0
  return count ?? 0
}
