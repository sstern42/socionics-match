import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getProfile } from './profile'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION, giving us the
    // current session — so getSession() is redundant and creates a second
    // concurrent loadProfile() call that can race against the first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(authId) {
    try {
      const p = await getProfile(authId)
      setProfile(p)
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

  return (
    <AuthContext.Provider value={{ session, profile, refreshProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
