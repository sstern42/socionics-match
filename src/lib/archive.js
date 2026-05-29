import { supabase } from './supabase'

/**
 * Archive a match for the current user.
 * Inserts a row into user_match_settings. If already archived, no-ops.
 */
export async function archiveMatch(userId, matchId) {
  const { error } = await supabase
    .from('user_match_settings')
    .upsert(
      { user_id: userId, match_id: matchId, archived_at: new Date().toISOString() },
      { onConflict: 'user_id,match_id' }
    )
  if (error) throw error
}

/**
 * Unarchive a match for the current user.
 * Deletes the row from user_match_settings.
 */
export async function unarchiveMatch(userId, matchId) {
  const { error } = await supabase
    .from('user_match_settings')
    .delete()
    .eq('user_id', userId)
    .eq('match_id', matchId)
  if (error) throw error
}

/**
 * Returns a Set of match IDs the user has archived.
 * Absence of a row = not archived.
 */
export async function getArchivedMatchIds(userId) {
  const { data, error } = await supabase
    .from('user_match_settings')
    .select('match_id')
    .eq('user_id', userId)
  if (error) throw error
  return new Set((data ?? []).map(r => r.match_id))
}
