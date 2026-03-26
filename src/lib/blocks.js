import { supabase } from './supabase'

// Returns all active blocks involving this user (as blocker or blocked)
export async function getActiveBlocks(userId) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('blocks')
    .select('id, blocker_id, blocked_id, type, expires_at')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
    .is('lifted_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
  if (error) throw error
  return data ?? []
}

// Returns the active block between two users if one exists
export async function getBlockBetween(userAId, userBId) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .or(
      `and(blocker_id.eq.${userAId},blocked_id.eq.${userBId}),and(blocker_id.eq.${userBId},blocked_id.eq.${userAId})`
    )
    .is('lifted_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

// Cool off — 7 day temporary block, silent
export async function coolOff(blockerId, blockedId) {
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  const { error } = await supabase
    .from('blocks')
    .insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
      type: 'cooloff',
      expires_at: expires.toISOString(),
    })
  if (error) throw error
}

// Hard block with reason
export async function hardBlock(blockerId, blockedId, reason, notes) {
  const { error } = await supabase
    .from('blocks')
    .insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
      type: 'block',
      reason,
      notes: notes || null,
      expires_at: null,
    })
  if (error) throw error
}

// Lift a cooloff block early
export async function liftBlock(blockId) {
  const { error } = await supabase
    .from('blocks')
    .update({ lifted_at: new Date().toISOString() })
    .eq('id', blockId)
  if (error) throw error
}
