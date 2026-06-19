// Shared time formatting that respects the user's 12h/24h clock preference
// (profile_data.use_24hour_clock, set on the Settings page).
export function formatTime(date, use24Hour) {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  })
}
