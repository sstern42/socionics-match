// Where to send someone after they sign in, when the page that sent them to
// /auth asked for it (e.g. /auth?redirect=/typing/uncle-sam). Only same-origin
// paths are accepted. Kept in sessionStorage because the OAuth round trip
// lands on / rather than back on /auth.
const KEY = 'post-auth-redirect'

export function safeRedirectPath(value) {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  if (value.startsWith('/auth')) return null
  return value
}

export function rememberPostAuthRedirect(value) {
  const path = safeRedirectPath(value)
  try { if (path) sessionStorage.setItem(KEY, path) } catch { /* storage unavailable */ }
  return path
}

export function takePostAuthRedirect() {
  try {
    const path = safeRedirectPath(sessionStorage.getItem(KEY))
    sessionStorage.removeItem(KEY)
    return path
  } catch { return null }
}
