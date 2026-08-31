import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { reportConnectionFailure, reportConnectionSuccess } from '../lib/connectionStatus.js'

// One store per (table + query shape), shared by every component that asks
// for it. Previously each caller got its own fetch and its own realtime
// channel, so with the Navbar and a page both calling useUsers()/useOrders()
// /useOrderItems() the app opened two subscriptions per table and fetched
// everything twice on each navigation. Now the first consumer starts the
// store and the last one to leave stops it.
const stores = new Map()

function createStore(key, config) {
  const { table, select, orderBy, ascending, limit, excludeDeleted } = config

  let state = { rows: [], loading: true, error: null }
  const listeners = new Set()
  let channel = null
  let refCount = 0
  // Guards against a slow earlier fetch landing after a newer one.
  let fetchToken = 0

  function emit(next) {
    state = next
    listeners.forEach((listener) => listener())
  }

  // Keeps realtime-patched rows in the order the query asked for. Without
  // this a pushed row always landed at the top — right for the
  // created_at-descending tables, wrong for every ascending one (staff by
  // name, order_items by id, trials by date) and wrong for a restored row,
  // which belongs back in its original position rather than at the front.
  function sortRows(list) {
    if (!orderBy) return list
    const direction = ascending ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a?.[orderBy]
      const bv = b?.[orderBy]
      // Nulls last in either direction — a missing due date or name
      // shouldn't outrank a real one.
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av === bv) return 0
      return (av < bv ? -1 : 1) * direction
    })
  }

  function setRows(updater) {
    const rows = typeof updater === 'function' ? updater(state.rows) : updater
    if (rows === state.rows) return
    emit({ ...state, rows })
  }

  async function fetchInitial() {
    const token = ++fetchToken
    let query = supabase.from(table).select(select)
    // Soft-deleted rows live on in their own table until the purge job
    // removes them; every normal screen has to filter them out.
    if (excludeDeleted) query = query.is('deleted_at', null)
    if (orderBy) query = query.order(orderBy, { ascending })
    if (limit) query = query.limit(limit)

    let data = null
    let error
    try {
      // supabase-js normally converts a transport failure into `{ error }`,
      // but anything that escapes as a rejection instead would leave this
      // store stuck on loading:true forever — every page that reads the
      // table would spin with no way out. Treat it as a failed fetch.
      const result = await query
      data = result.data
      error = result.error
    } catch (thrown) {
      error = thrown instanceof Error ? thrown : new Error(String(thrown))
    }

    if (token !== fetchToken) return

    if (error) {
      console.warn(`[useRealtimeTable] "${table}" fetch failed:`, error.message)
      reportConnectionFailure(error)
      emit({ rows: [], loading: false, error })
    } else {
      reportConnectionSuccess()
      emit({ rows: data ?? [], loading: false, error: null })
    }
  }

  function handleChange(payload) {
    setRows((current) => {
      if (payload.eventType === 'INSERT') {
        if (excludeDeleted && payload.new.deleted_at) return current
        // The initial fetch and this event can race and both deliver the
        // same row (inserted right as the page mounts) — dedupe by id.
        if (current.some((row) => row.id === payload.new.id)) return current
        return sortRows([payload.new, ...current])
      }
      if (payload.eventType === 'UPDATE') {
        // A soft delete arrives as an UPDATE, not a DELETE — drop the row.
        if (excludeDeleted && payload.new.deleted_at) {
          return current.filter((row) => row.id !== payload.new.id)
        }
        // A restore also arrives as an UPDATE, of a row no longer in the
        // list, so mapping over `current` alone would silently ignore it.
        if (!current.some((row) => row.id === payload.new.id)) {
          return sortRows([payload.new, ...current])
        }
        return sortRows(current.map((row) => (row.id === payload.new.id ? payload.new : row)))
      }
      if (payload.eventType === 'DELETE') {
        return current.filter((row) => row.id !== payload.old.id)
      }
      return current
    })
  }

  function start() {
    if (channel) return
    // Rows already cached from a previous mount stay on screen while they
    // refresh in the background, so moving between pages doesn't flash an
    // empty table.
    if (state.rows.length === 0 && !state.loading) emit({ ...state, loading: true })
    fetchInitial()
    channel = supabase
      .channel(`rt:${key}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, handleChange)
      .subscribe()
  }

  function stop() {
    if (!channel) return
    supabase.removeChannel(channel)
    channel = null
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() {
      return state
    },
    retain() {
      refCount += 1
      if (refCount === 1) start()
    },
    release() {
      refCount = Math.max(0, refCount - 1)
      // The store itself is kept in the map (there are only a handful of
      // tables) so its rows survive as a cache; only the socket goes.
      if (refCount === 0) stop()
    },
    refetch: fetchInitial,
    mutate: setRows,
  }
}

// Loads a table once, then keeps it in sync via Supabase Realtime.
// Point it at any table (e.g. useRealtimeTable('transactions', { orderBy: 'created_at' })).
export function useRealtimeTable(
  table,
  { select = '*', orderBy, ascending = false, limit, excludeDeleted = false } = {},
) {
  const key = `${table}|${select}|${orderBy ?? ''}|${ascending}|${limit ?? ''}|${excludeDeleted}`

  const store = useMemo(() => {
    let existing = stores.get(key)
    if (!existing) {
      existing = createStore(key, { table, select, orderBy, ascending, limit, excludeDeleted })
      stores.set(key, existing)
    }
    return existing
  }, [key, table, select, orderBy, ascending, limit, excludeDeleted])

  useEffect(() => {
    store.retain()
    return () => store.release()
  }, [store])

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return {
    rows: snapshot.rows,
    loading: snapshot.loading,
    error: snapshot.error,
    refetch: store.refetch,
    mutate: store.mutate,
  }
}
