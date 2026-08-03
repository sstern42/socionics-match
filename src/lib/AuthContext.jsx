import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import { getProfile } from './profile'
import { computeIsPremium } from './premium'
import { awardPoints } from './points'

const AuthContext = createContext(null)

// If Supabase can't be reached (e.g. carrier DNS failure / filtering on
// cellular), onAuthStateChange may never fire — leaving session/profile stuck
// at `undefined` and the whole app gated on white. After this long, give up
// waiting and resolve to a logged-out shell so SOMETHING paints. The real auth
// state still takes over whenever the connection comes through.
const AUTH_BOOT_TIMEOUT_MS = 6000

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)
  const [previousLastActive, setPreviousLastActive] = useState(null)
  const settledRef = useRef(false)
  const capturedRef = useRef(false)

  useEffect(() => {
    // Boot timeout — if nothing has resolved auth yet, stop blocking first paint.
    const bootTimer = setTimeout(() => {
      if (!settledRef.current) {
        console.warn('Auth did not initialise within timeout — booting logged-out shell.')
        setSession(s => (s === undefined ? null : s))
        setProfile(p => (p === undefined ? null : p))
      }
    }, AUTH_BOOT_TIMEOUT_MS)

    // onAuthStateChange fires immediately with INITIAL_SESSION, giving us the
    // current session — so getSession() is redundant and creates a second
    // concurrent loadProfile() call that can race against the first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      settledRef.current = true
      setSession(session)
      if (session) {
        // loadProfile() does a profile re-fetch plus a last_active write and a
        // daily_login points award. Only run it on events that represent a
        // genuine (re-)authentication — INITIAL_SESSION on boot and SIGNED_IN.
        // Skip TOKEN_REFRESHED (fires periodically) and USER_UPDATED so a
        // background token refresh doesn't trigger redundant DB writes and an
        // avoidable profile re-render on every refresh.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          loadProfile(session.user.id)
        }
      } else {
        setProfile(null)
      }
    })

    return () => { clearTimeout(bootTimer); subscription.unsubscribe() }
  }, [])

  async function loadProfile(authId) {
    try {
      const p = await getProfile(authId)
      setProfile(p)
      // Capture the pre-update last_active once per session — used to compute
      // a "what you missed" catch-up summary on login.
      if (!capturedRef.current) {
        capturedRef.current = true
        setPreviousLastActive(p?.last_active ?? null)
      }
      // Update last_active silently — fire and forget (skip if hide_activity is on)
      if (p?.id && !p.profile_data?.hide_activity) {
        supabase.from('users').update({ last_active: new Date().toISOString() }).eq('id', p.id).then(() => {})
      }
      // First activity of the day earns points — award_points()'s ref_id
      // uniqueness (keyed on today's date) makes this a no-op on later
      // loadProfile() calls the same day, so it's safe to fire on every load.
      if (p?.id) {
        awardPoints('daily_login', new Date().toISOString().slice(0, 10))
      }
    } catch {
      setProfile(null)
    }
  }

  async function refreshProfile() {
    if (!session) return null
    try {
      const p = await getProfile(session.user.id)
      setProfile(p)
      return p
    } catch {
      setProfile(null)
      return null
    }
  }

  const loading = session === undefined || profile === undefined

  // Derived premium status — single source of truth in lib/premium.js.
  // Founding members and active/past_due subscribers are premium.
  const isPremium = computeIsPremium(profile)

  return (
    <AuthContext.Provider value={{ session, profile, refreshProfile, loading, isPremium, previousLastActive }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
