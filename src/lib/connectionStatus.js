import { supabase } from './supabaseClient.js'

// Tracks whether Supabase is actually reachable, as a plain module-level
// store rather than React state — the data layer that discovers a failure
// (useRealtimeTable's store) lives outside the component tree and has no
// context to report into.

let state = navigator.onLine ? 'online' : 'offline'
const listeners = new Set()

function set(next) {
  if (next === state) return
  state = next
  listeners.forEach((listener) => listener())
}

export function getConnectionState() {
  return state
}

export function subscribeConnection(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Distinguishes "the server is unreachable" from "the server answered and
// said no". A PostgREST error (row-level security, a missing column, a bad
// filter) means the round trip worked and must NOT black out the app —
// only a genuine transport failure should. supabase-js surfaces those as a
// wrapped fetch rejection with no SQLSTATE code attached.
export function isConnectionError(error) {
  if (!error) return false
  if (error.code) return false
  const message = String(error.message ?? '').toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('fetch failed') ||
    message.includes('timeout')
  )
}

export function reportConnectionFailure(error) {
  if (isConnectionError(error)) set('offline')
}

export function reportConnectionSuccess() {
  set('online')
}

// One cheap round trip. An empty result still proves reachability, so this
// works whether or not anyone is signed in — row-level security returning
// nothing is a successful response, not a failure.
export async function probeConnection() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1)
    if (error && isConnectionError(error)) {
      set('offline')
      return false
    }
    set('online')
    return true
  } catch {
    set('offline')
    return false
  }
}

if (typeof window !== 'undefined') {
  // The browser knows about a dropped interface faster than a failed
  // request does; coming back only means the interface is up, so that side
  // is confirmed with a real probe rather than trusted.
  window.addEventListener('offline', () => set('offline'))
  window.addEventListener('online', () => {
    probeConnection()
  })
}
