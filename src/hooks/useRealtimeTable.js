import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Generic helper: loads a table once, then keeps it in sync via Supabase Realtime.
// Point it at any table (e.g. useRealtimeTable('transactions', { orderBy: 'created_at' })).
export function useRealtimeTable(table, { select = '*', orderBy, ascending = false, limit } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Multiple components can use the same table hook at once (e.g. a modal
  // and its parent page both calling useUsers()) — each needs its own
  // channel, or Supabase errors trying to subscribe the same topic twice.
  const instanceId = useId()

  const fetchInitial = useCallback(async () => {
    let query = supabase.from(table).select(select)
    if (orderBy) query = query.order(orderBy, { ascending })
    if (limit) query = query.limit(limit)

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.warn(`[useRealtimeTable] "${table}" fetch failed:`, fetchError.message)
      setError(fetchError)
      setRows([])
    } else {
      setError(null)
      setRows(data ?? [])
    }
    setLoading(false)
  }, [table, select, orderBy, ascending, limit])

  useEffect(() => {
    // Initial load, then Realtime pushes keep `rows` in sync — the standard
    // fetch-in-effect pattern from react.dev, which this lint rule over-flags.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitial()

    const channel = supabase
      .channel(`realtime:${table}:${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        setRows((current) => {
          if (payload.eventType === 'INSERT') {
            // The initial fetch and this event can race and both deliver the
            // same row (e.g. inserted right as the page mounts) — dedupe by id.
            if (current.some((row) => row.id === payload.new.id)) return current
            return [payload.new, ...current]
          }
          if (payload.eventType === 'UPDATE') {
            return current.map((row) => (row.id === payload.new.id ? payload.new : row))
          }
          if (payload.eventType === 'DELETE') {
            return current.filter((row) => row.id !== payload.old.id)
          }
          return current
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchInitial, table, instanceId])

  return { rows, loading, error, refetch: fetchInitial, mutate: setRows }
}
