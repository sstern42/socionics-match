import { supabase } from './supabase'
import { getMatchingTypes, getRelation } from '../data/relations'

const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000 // only summarize if away > 30 min
const SHOWN_KEY = 'socion_catchup_last_shown'

/** Whether a catch-up summary should fire for this login. */
export function shouldShowCatchup(previousLastActive) {
  if (!previousLastActive) return false // first-ever session, nothing to diff against
  const gapMs = Date.now() - new Date(previousLastActive).getTime()
  if (gapMs < OFFLINE_THRESHOLD_MS) return false

  const lastShown = sessionStorage.getItem(SHOWN_KEY)
  if (lastShown === previousLastActive) return false // already shown for this gap this session

  return true
}

export function markCatchupShown(previousLastActive) {
  sessionStorage.setItem(SHOWN_KEY, previousLastActive)
}

/**
 * Summarize what happened while the user was offline, grouped by type.
 * Returns only the groups that have something to show.
 */
export async function getCatchupSummary({ profile, previousLastActive }) {
  const since = previousLastActive

  const [notifResult, membersResult] = await Promise.all([
    supabase
      .from('notifications')
      .select('type')
      .eq('user_id', profile.id)
      .gt('created_at', since)
      .in('type', ['new_message', 'new_connection', 'founder_post']),
    getNewMembersSince(profile, since),
  ])

  const counts = { new_message: 0, new_connection: 0, founder_post: 0 }
  for (const n of notifResult.data ?? []) counts[n.type] = (counts[n.type] ?? 0) + 1

  const groups = []
  if (counts.new_message > 0) {
    groups.push({
      kind: 'catchup_message',
      colour: '#9a6f38',
      icon: '💬',
      heading: 'new messages',
      body: `${counts.new_message} new message${counts.new_message > 1 ? 's' : ''} while you were away`,
    })
  }
  if (counts.new_connection > 0) {
    groups.push({
      kind: 'catchup_connection',
      colour: '#4caf50',
      icon: '🤝',
      heading: 'new connections',
      body: `${counts.new_connection} new connection${counts.new_connection > 1 ? 's' : ''}`,
    })
  }
  if (membersResult.count > 0) {
    groups.push({
      kind: 'catchup_member',
      colour: '#185FA5',
      icon: '✨',
      heading: 'new members nearby',
      body: membersResult.hasDual
        ? `${membersResult.count} new member${membersResult.count > 1 ? 's' : ''} joined, incl. your dual`
        : `${membersResult.count} new member${membersResult.count > 1 ? 's' : ''} joined`,
    })
  }
  if (counts.founder_post > 0) {
    groups.push({
      kind: 'catchup_founder_post',
      colour: '#9a6f38',
      icon: '📣',
      heading: 'new from spencer',
      body: 'a new update was posted',
    })
  }

  return groups
}

async function getNewMembersSince(profile, since) {
  const compatibleTypes = getMatchingTypes(profile.type, profile.relation_preferences ?? [])
  if (compatibleTypes.length === 0) return { count: 0, hasDual: false }

  const { data, error } = await supabase
    .from('users')
    .select('id, type')
    .neq('id', profile.id)
    .not('profile_data', 'is', null)
    .in('type', compatibleTypes)
    .gt('created_at', since)

  if (error || !data) return { count: 0, hasDual: false }

  const hasDual = data.some(u => getRelation(profile.type, u.type) === 'DUAL')
  return { count: data.length, hasDual }
}
