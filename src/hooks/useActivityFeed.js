import { useMemo } from 'react'
import { useUsers } from './useUsers.js'
import { useOrders } from './useOrders.js'
import { useOrderItems } from './useOrderItems.js'
import { useTransactions } from './useTransactions.js'
import { formatINR } from '../utils/format.js'
import { relativeTime } from '../utils/relativeTime.js'
import { localDateKey } from '../utils/dateOnly.js'
import { itemsSummary } from '../utils/orderItems.js'

// Synthesizes a "recent activity" feed from data that already exists (new
// customers, new orders, recorded payments/refunds) instead of a separate
// activity-log table — there's no dedicated event log in the schema, and
// everything shown here is already timestamped where it's created.
export function useActivityFeed() {
  const { users } = useUsers()
  const { orders } = useOrders()
  const { items } = useOrderItems()
  const { transactions } = useTransactions()

  const events = useMemo(() => {
    const list = []

    const itemsByOrder = new Map()
    for (const i of items) {
      if (!itemsByOrder.has(i.order_id)) itemsByOrder.set(i.order_id, [])
      itemsByOrder.get(i.order_id).push(i)
    }

    for (const u of users) {
      if (!u.created_at) continue
      list.push({
        id: `customer-${u.id}`,
        type: 'customer',
        title: 'New customer added',
        detail: u.name,
        created_at: u.created_at,
      })
    }

    for (const o of orders) {
      if (!o.created_at) continue
      const summary = itemsSummary(itemsByOrder.get(o.id) ?? [])
      list.push({
        id: `order-${o.id}`,
        type: 'order',
        title: `New order ORD-${o.id}`,
        detail: summary || 'Order placed',
        created_at: o.created_at,
      })
    }

    for (const t of transactions) {
      if (!t.created_at) continue
      const isRefund = t.status === 'Refunded'
      list.push({
        id: `transaction-${t.id}`,
        type: isRefund ? 'refund' : 'payment',
        title: isRefund ? 'Refund issued' : 'Payment received',
        detail: `${t.customer} — ${formatINR(t.amount)}`,
        created_at: t.created_at,
      })
    }

    return list
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((ev) => ({
        ...ev,
        time: relativeTime(ev.created_at),
        date: localDateKey(ev.created_at),
      }))
  }, [users, orders, items, transactions])

  return { events }
}
