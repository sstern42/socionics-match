// Giphy is optional (issue #973): VITE_GIPHY_API_KEY is a public,
// rate-limited key, and a fresh clone won't have one. Rather than letting
// the picker open and fail with "Could not load GIFs.", callers hide the GIF
// affordance entirely when the key is absent.
export const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY
export const GIF_ENABLED = Boolean(GIPHY_KEY)
