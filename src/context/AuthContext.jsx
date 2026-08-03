import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { AuthContext } from './authContext.js'

// `session` states: undefined = not checked yet, null = signed out,
// object = signed in. Kept in one Provider (rather than one listener per
// consumer) so there's a single supabase.auth listener for the whole app.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading: session === undefined,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
