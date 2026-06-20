import { supabase } from './supabase'

export async function reportUser({ reporterId, reportedUserId, reason = null, notes = null }) {
  const { error } = await supabase
    .from('user_reports')
    .insert({ reporter_id: reporterId, reported_user_id: reportedUserId, reason, notes })

  if (error) throw error
  window.umami?.track('user-reported')
}

export async function resolveUserReport(reportId, resolution = null) {
  const { error } = await supabase
    .from('user_reports')
    .update({ resolved_at: new Date().toISOString(), resolution })
    .eq('id', reportId)

  if (error) throw error
}
