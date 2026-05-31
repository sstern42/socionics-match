import { supabase } from './supabase'

// Disconnect from a match. Soft-delete via the SECURITY DEFINER `unmatch` RPC,
// which derives the caller from auth.uid() and stamps unmatched_at/unmatched_by.
// Idempotent and mutual: once either party unmatches, the connection drops out
// of both people's feeds, connections list, and free-tier cap count. Message
// history is retained but no longer surfaced.
export async function unmatch(matchId) {
  const { error } = await supabase.rpc('unmatch', { p_match_id: matchId })
  if (error) throw error
  window.umami?.track('match-unmatched')
}
