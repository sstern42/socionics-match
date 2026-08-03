import { supabase } from './supabase'

// Fire-and-forget: called right after a primary action succeeds (message
// sent, board post created, etc.). Never throws — a rewards hiccup should
// never surface to the user or block the action that earned it. award_points()
// itself no-ops silently on unknown action types or a reached daily cap.
//
// There is deliberately no user id to pass: award_points() derives the user
// from the session, so the caller can only ever award themselves (issue #970).
export async function awardPoints(actionType, refId) {
  try {
    const { error } = await supabase.rpc('award_points', {
      p_action_type: actionType,
      p_ref_id: String(refId),
    })
    if (error) throw error
  } catch (err) {
    console.error('awardPoints failed:', err)
  }
}

// A mutual match credits both participants, which caller-derivation alone
// can't express — so the server takes the match id, checks the caller is one
// of the two participants, and awards both from the match row.
export async function awardMatchPoints(matchId) {
  try {
    const { error } = await supabase.rpc('award_match_points', { p_match_id: matchId })
    if (error) throw error
  } catch (err) {
    console.error('awardMatchPoints failed:', err)
  }
}

export async function getPointsTotal(userId) {
  const { data, error } = await supabase.rpc('get_points_total', { p_user_id: userId })
  if (error) throw error
  return data ?? 0
}

// Per-action-type summary (points + count for each way the user has earned
// points), not a raw per-transaction list — repeatable actions can rack up
// hundreds of rows over time.
export async function getPointsBreakdown(userId) {
  const { data, error } = await supabase.rpc('get_points_breakdown', { p_user_id: userId })
  if (error) throw error
  return data ?? []
}
