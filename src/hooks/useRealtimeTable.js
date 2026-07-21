import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Generic helper: loads a table once, then keeps it in sync via Supabase Realtime.
// Point it at any table (e.g. useRealtimeTable('transactions', { orderBy: 'created_at' })).
export function useRealtimeTable(table, { select = '*', orderBy, ascending = false, limit } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        setRows((current) => {
          if (payload.eventType === 'INSERT') {
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
  }, [fetchInitial, table])

  return { rows, loading, error, refetch: fetchInitial, mutate: setRows }
}
