import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { reportConnectionFailure } from '../lib/connectionStatus.js'
import { AuthContext } from './authContext.js'

// `session` states: undefined = not checked yet, null = signed out,
// object = signed in. Kept in one Provider (rather than one listener per
// consumer) so there's a single supabase.auth listener for the whole app.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Without the catch, an unreachable server leaves `session` undefined
    // forever and RequireAuth renders a blank loading screen with nothing
    // to break the deadlock. Reporting the failure flips the app to the
    // server-down page instead.
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err) => {
        reportConnectionFailure(err)
        setSession(null)
      })

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
