// Best-effort platform detection from the user agent, used to tag a new
// signup with the kind of device it came from (surfaced in the Discord
// #signups notification). Returns a small stable key; human-friendly
// labels are applied server-side in the discord-notify edge function.
export function getSignupDevice() {
  const ua = navigator.userAgent || ''
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/macintosh|mac os x/i.test(ua)) return 'mac'
  if (/windows/i.test(ua)) return 'windows'
  if (/linux/i.test(ua)) return 'linux'
  return 'other'
}
