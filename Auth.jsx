import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getProfile } from './profile'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined) // undefined = not yet loaded

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id)
      } else {
        setProfile(null)
      }
    })

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
      setProfile(p) // null if not found, object if found
    } catch {
      setProfile(null)
    }
  }

  // Returns the freshly loaded profile so callers can await it
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
