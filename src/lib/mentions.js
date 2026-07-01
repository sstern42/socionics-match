import { supabase } from './supabase'

const MAX_RESULTS = 6

// Search users by display-name prefix for the @mention autocomplete in Board
// post/comment composers (#829). `users` SELECT is open to all authenticated
// users (supabase/rls_reset.sql "Users: read all profiles"), so this queries
// directly rather than via an RPC. Anonymous users are filtered out
// client-side since anonymity may be represented by a missing key rather
// than an explicit `false`, which PostgREST can't express in one filter.
export async function searchMentionableUsers(query, { excludeUserId } = {}) {
  const q = query.trim()
  if (!q) return []

  let request = supabase
    .from('users')
    .select('id, type, profile_data, avatar_url')
    .ilike('profile_data->>name', `${q}%`)
    .limit(MAX_RESULTS * 3)
  if (excludeUserId) request = request.neq('id', excludeUserId)

  const { data, error } = await request
  if (error) throw error

  return (data ?? [])
    .filter(u => u.profile_data?.name && !u.profile_data?.anonymous)
    .slice(0, MAX_RESULTS)
    .map(u => ({ id: u.id, name: u.profile_data.name, type: u.type, avatarUrl: u.avatar_url }))
}
