import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getProfile } from './profile'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setProfile(null)
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

  function refreshProfile() {
    if (session) loadProfile(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, profile, refreshProfile, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
