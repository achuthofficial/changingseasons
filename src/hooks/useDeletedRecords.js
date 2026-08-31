import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatCustomerId, formatINR } from '../utils/format.js'
import { collectRecordImages, removeStorageObject } from '../utils/storageCleanup.js'

// Must match the window in supabase-soft-delete-restore.sql.txt. The purge
// job there runs every 5 minutes, so a row can briefly survive past the
// hour; the UI hides anything already expired so the countdown stays exact
// regardless of when the job next fires.
export const RETENTION_MINUTES = 60
const RETENTION_MS = RETENTION_MINUTES * 60 * 1000

// Every table the admin UI can delete from. Each entry knows how to
// describe one of its rows in a single line, so the bin can list five
// different record types in one table.
const SOURCES = [
  {
    table: 'users',
    type: () => 'Customer',
    title: (r) => r.name || 'Unnamed customer',
    detail: (r) => [formatCustomerId(r.id), r.phone].filter(Boolean).join(' · '),
  },
  {
    table: 'orders',
    type: () => 'Order',
    title: (r) => `ORD-${r.id}`,
    detail: (r) => [formatINR(r.quoted_amount ?? 0), r.order_status].filter(Boolean).join(' · '),
  },
  {
    table: 'staff',
    type: () => 'Staff',
    title: (r) => r.name || 'Unnamed staff member',
    detail: (r) => [r.role, r.phone].filter(Boolean).join(' · ') || '—',
  },
  {
    table: 'transactions',
    type: () => 'Transaction',
    title: (r) => `TXN-${r.id}`,
    detail: (r) => [r.customer, formatINR(r.amount ?? 0), r.method].filter(Boolean).join(' · '),
  },
  {
    table: 'expenses',
    // Expense and Income share one table but read as different things.
    type: (r) => r.entry_type || 'Expense',
    title: (r) => r.category || 'Uncategorised',
    detail: (r) => [formatINR(r.amount ?? 0), r.entry_date, r.notes].filter(Boolean).join(' · '),
  },
]

// Loads every soft-deleted row across all five tables. Deliberately not
// built on useRealtimeTable: that would mean five more realtime channels
// open for a screen that's rarely looked at, when a fetch on mount plus a
// refetch after each action covers it. A 1s tick drives the countdowns and
// drops rows the moment they expire, so nothing lingers past its window
// even if the purge job hasn't run yet.
export function useDeletedRecords() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [failures, setFailures] = useState([])
  const [now, setNow] = useState(() => Date.now())
  // Avoids a setState on an unmounted component if the admin navigates away
  // mid-fetch, and stops a slow earlier request overwriting a newer one.
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    const results = await Promise.all(
      SOURCES.map(async (source) => {
        const { data, error } = await supabase
          .from(source.table)
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
        return { source, data, error }
      }),
    )
    if (id !== requestId.current) return

    const rowsByTable = {}
    const nextFailures = []
    for (const { source, data, error } of results) {
      if (error) {
        // One missing table (e.g. this migration not run yet) shouldn't
        // blank the whole screen — show what did load and name what didn't.
        nextFailures.push(`${source.table}: ${error.message}`)
        rowsByTable[source.table] = []
        continue
      }
      rowsByTable[source.table] = data ?? []
    }

    // Deleting a customer cascades to their orders and those orders'
    // payments. Listing all three separately invites restoring a child on
    // its own, which brings an order back under a customer who is still
    // deleted — it shows up on the Orders page as "Unknown". So only the top
    // of each cascade is listed, the way a trash folder shows the folder
    // rather than every file inside it. Restoring it returns the whole batch.
    //
    // A table that failed to load leaves its set empty, which means nothing
    // gets hidden. Showing a record that could have been folded away is a
    // far smaller problem than hiding one and making it unrecoverable.
    const deletedUserIds = new Set(rowsByTable.users.map((row) => row.id))
    const deletedOrderIds = new Set(rowsByTable.orders.map((row) => row.id))

    const ordersByCustomer = new Map()
    for (const order of rowsByTable.orders) {
      if (!ordersByCustomer.has(order.customer_id)) ordersByCustomer.set(order.customer_id, [])
      ordersByCustomer.get(order.customer_id).push(order)
    }
    const transactionsByOrder = new Map()
    for (const tx of rowsByTable.transactions) {
      if (tx.order_id == null) continue
      if (!transactionsByOrder.has(tx.order_id)) transactionsByOrder.set(tx.order_id, [])
      transactionsByOrder.get(tx.order_id).push(tx)
    }

    function isInsideListedCascade(table, row) {
      if (table === 'orders') return deletedUserIds.has(row.customer_id)
      if (table === 'transactions') return row.order_id != null && deletedOrderIds.has(row.order_id)
      return false
    }

    // Spells out what a restore will bring back with it, so folding the
    // children away doesn't hide what's actually at stake.
    function cascadeNote(table, row) {
      if (table === 'users') {
        const orders = ordersByCustomer.get(row.id) ?? []
        const payments = orders.reduce(
          (total, order) => total + (transactionsByOrder.get(order.id)?.length ?? 0),
          0,
        )
        const parts = []
        if (orders.length > 0) parts.push(`${orders.length} order(s)`)
        if (payments > 0) parts.push(`${payments} payment(s)`)
        return parts.length > 0 ? `includes ${parts.join(' and ')}` : ''
      }
      if (table === 'orders') {
        const payments = transactionsByOrder.get(row.id)?.length ?? 0
        return payments > 0 ? `includes ${payments} payment(s)` : ''
      }
      return ''
    }

    const nextRecords = []
    for (const source of SOURCES) {
      for (const row of rowsByTable[source.table]) {
        if (isInsideListedCascade(source.table, row)) continue
        nextRecords.push({
          key: `${source.table}-${row.id}`,
          table: source.table,
          id: row.id,
          type: source.type(row),
          title: source.title(row),
          detail: [source.detail(row), cascadeNote(source.table, row)].filter(Boolean).join(' · '),
          deletedAt: row.deleted_at,
          expiresAt: new Date(row.deleted_at).getTime() + RETENTION_MS,
        })
      }
    }

    nextRecords.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
    setRecords(nextRecords)
    setFailures(nextFailures)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Anything past its window is treated as gone even before the job removes
  // it, so the list never offers a Restore that would race the purge.
  const visible = useMemo(
    () => records.filter((r) => Number.isFinite(r.expiresAt) && r.expiresAt > now),
    [records, now],
  )

  const restore = useCallback(
    async (record) => {
      const { error } = await supabase
        .from(record.table)
        .update({ deleted_at: null })
        .eq('id', record.id)
      if (error) return { error: error.message }
      await refresh()
      return {}
    },
    [refresh],
  )

  const purgeNow = useCallback(
    async (record) => {
      // Gathered before the row goes: once it's deleted the foreign keys
      // cascade its children away and there's nothing left to tell us which
      // files belonged to it.
      const images = await collectRecordImages(record.table, record.id)
      const { error } = await supabase.from(record.table).delete().eq('id', record.id)
      if (error) return { error: error.message }
      for (const { url, bucket } of images) {
        await removeStorageObject(url, bucket)
      }
      await refresh()
      return {}
    },
    [refresh],
  )

  return { records: visible, loading, failures, now, refresh, restore, purgeNow }
}
