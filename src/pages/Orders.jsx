import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import RowMenu from '../components/RowMenu.jsx'
import StatusMenu from '../components/StatusMenu.jsx'
import OrderModal from '../components/OrderModal.jsx'
import PaymentModal from '../components/PaymentModal.jsx'
import { IconSearch, IconWhatsApp } from '../components/Icons.jsx'
import { useOrders } from '../hooks/useOrders.js'
import { RETENTION_MINUTES } from '../hooks/useDeletedRecords.js'
import { useUsers } from '../hooks/useUsers.js'
import { useOrderTrials } from '../hooks/useOrderTrials.js'
import { useOrderItems } from '../hooks/useOrderItems.js'
import { useTransactions } from '../hooks/useTransactions.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatCustomerId, formatINR } from '../utils/format.js'
import { generateCustomerReceiptPdf, generateTailorReceiptPdfs } from '../utils/generateReceiptPdf.js'
import { daysUntil } from '../utils/dateOnly.js'
import { garmentLabel, itemsSummary } from '../utils/orderItems.js'
import { buildWhatsAppLink, orderReadyMessage } from '../utils/whatsapp.js'
import './Orders.css'

const tabs = ['All', 'Pending', 'In Progress', 'Ready', 'Delivered', 'Cancelled']
const OPEN_STATUSES = ['Pending', 'In Progress', 'Ready']
const orderStatuses = ['Pending', 'In Progress', 'Ready', 'Delivered', 'Cancelled']
const trialStatuses = ['Scheduled', 'Attended', 'Missed', 'Rescheduled']

export default function Orders() {
  const { orders, mutate, loading: ordersLoading } = useOrders()
  const { users } = useUsers()
  const { trials } = useOrderTrials()
  const { items } = useOrderItems()
  const { transactions } = useTransactions()

  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')
  const [dueFilter, setDueFilter] = useState('none')
  const [modalOrder, setModalOrder] = useState(undefined)
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const openId = searchParams.get('openOrder')
    if (!openId || ordersLoading) return
    const match = orders.find((o) => String(o.id) === openId)
    // Syncing local state from the URL (an external source), same
    // fetch-in-effect shape as useRealtimeTable — this lint rule over-flags it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setModalOrder(match)
    setSearchParams(
      (prev) => {
        prev.delete('openOrder')
        return prev
      },
      { replace: true },
    )
  }, [searchParams, orders, ordersLoading, setSearchParams])

  const customerMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const latestTrialByOrder = useMemo(() => {
    const map = new Map()
    for (const t of trials) {
      const current = map.get(t.order_id)
      if (!current || new Date(t.trial_date ?? 0) >= new Date(current.trial_date ?? 0)) {
        map.set(t.order_id, t)
      }
    }
    return map
  }, [trials])

  const itemsByOrder = useMemo(() => {
    const map = new Map()
    for (const i of items) {
      if (!map.has(i.order_id)) map.set(i.order_id, [])
      map.get(i.order_id).push(i)
    }
    return map
  }, [items])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesTab = tab === 'All' || o.order_status === tab
      const d = daysUntil(o.due_date)
      const matchesDue =
        dueFilter === 'none' ||
        (dueFilter === 'dueSoon' && OPEN_STATUSES.includes(o.order_status) && d !== null && d >= 0 && d <= 3) ||
        (dueFilter === 'overdue' && OPEN_STATUSES.includes(o.order_status) && d !== null && d < 0)

      const q = query.trim().toLowerCase()
      const customer = customerMap.get(o.customer_id)
      const orderItems = itemsByOrder.get(o.id) ?? []
      const matchesQuery =
        !q ||
        String(o.id).includes(q) ||
        (customer?.name ?? '').toLowerCase().includes(q) ||
        orderItems.some((i) => garmentLabel(i).toLowerCase().includes(q))

      return matchesTab && matchesDue && matchesQuery
    })
  }, [orders, tab, dueFilter, query, customerMap, itemsByOrder])

  // Soft delete — the order moves to Recently Deleted and can be restored
  // for RETENTION_MINUTES. A database trigger takes its linked transactions
  // with it; order_items and order_trials stay attached to the hidden order
  // and come back with it untouched.
  async function handleDelete(order) {
    const txCount = transactions.filter((t) => t.order_id === order.id).length
    const warning = txCount > 0 ? ` Its ${txCount} linked transaction(s) will go with it.` : ''
    const ok = window.confirm(
      `Move order ORD-${order.id} to Recently Deleted?${warning} You can restore it for the next ${RETENTION_MINUTES} minutes.`,
    )
    if (!ok) return
    // Written first, then removed from the list. Removing optimistically and
    // failing afterwards would leave the row missing from the screen while
    // it still very much exists in the database.
    const { error } = await supabase
      .from('orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) {
      window.alert(`Failed to delete order: ${error.message}`)
      return
    }
    mutate((current) => current.filter((o) => o.id !== order.id))
  }

  async function handleDownloadCustomerReceipt(order) {
    try {
      await generateCustomerReceiptPdf({
        order,
        customer: customerMap.get(order.customer_id),
        items: itemsByOrder.get(order.id) ?? [],
      })
    } catch (err) {
      window.alert(`Could not generate receipt: ${err.message}`)
    }
  }

  async function handleDownloadTailorReceipts(order) {
    try {
      await generateTailorReceiptPdfs({
        order,
        customer: customerMap.get(order.customer_id),
        items: itemsByOrder.get(order.id) ?? [],
      })
    } catch (err) {
      window.alert(`Could not generate tailor receipts: ${err.message}`)
    }
  }

  async function handleOrderStatusChange(order, next) {
    const { error } = await supabase.from('orders').update({ order_status: next }).eq('id', order.id)
    if (error) window.alert(`Failed to update status: ${error.message}`)
  }

  async function handleTrialStatusChange(trial, next) {
    const { error } = await supabase.from('order_trials').update({ status: next }).eq('id', trial.id)
    if (error) window.alert(`Failed to update trial status: ${error.message}`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>{orders.length} orders on file</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOrder(null)}>
          + Add Order
        </button>
      </div>

      <section className="card">
        <div className="toolbar">
          <label className="toolbar-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Search by customer, garment, or order ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="pill-tabs">
            {tabs.map((t) => (
              <button
                key={t}
                className={`pill-tab ${tab === t ? 'is-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="pill-tabs">
            {['none', 'dueSoon', 'overdue'].map((f) => (
              <button
                key={f}
                className={`pill-tab ${dueFilter === f ? 'is-active' : ''}`}
                onClick={() => setDueFilter(dueFilter === f ? 'none' : f)}
              >
                {f === 'none' ? 'Any due date' : f === 'dueSoon' ? 'Due Soon' : 'Overdue'}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Garment</th>
                <th>Trial</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Pending</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const customer = customerMap.get(o.customer_id)
                const latestTrial = latestTrialByOrder.get(o.id)
                const orderItems = itemsByOrder.get(o.id) ?? []
                const balance = Number(o.quoted_amount ?? 0) - Number(o.advance_paid ?? 0)
                // null when the customer has no phone on file, or one that
                // can't make a dialable number — no button rather than a
                // link that opens the wrong chat.
                const whatsAppLink =
                  o.order_status === 'Ready'
                    ? buildWhatsAppLink(
                        customer?.phone,
                        orderReadyMessage({
                          customerName: customer?.name,
                          orderId: o.id,
                          items: orderItems,
                          order: o,
                        }),
                      )
                    : null
                return (
                  <tr key={o.id}>
                    <td className="mono">ORD-{o.id}</td>
                    <td>
                      <p className="cell-user-name">{customer?.name ?? 'Unknown'}</p>
                      <p className="cell-user-sub">{formatCustomerId(o.customer_id)}</p>
                    </td>
                    <td>{itemsSummary(orderItems)}</td>
                    <td>
                      {latestTrial ? (
                        <StatusMenu
                          status={latestTrial.status}
                          options={trialStatuses}
                          onSelect={(next) => handleTrialStatusChange(latestTrial, next)}
                        />
                      ) : (
                        <span className="empty-cell">—</span>
                      )}
                    </td>
                    <td>{o.due_date ?? '—'}</td>
                    <td className="cell-amount">{formatINR(o.quoted_amount)}</td>
                    <td className="cell-amount">{formatINR(balance)}</td>
                    <td>
                      <div className="status-cell">
                        <StatusMenu
                          status={o.order_status}
                          options={orderStatuses}
                          onSelect={(next) => handleOrderStatusChange(o, next)}
                        />
                        {whatsAppLink && (
                          <a
                            className="whatsapp-send-btn"
                            href={whatsAppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <IconWhatsApp size={13} />
                            Send Message
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <RowMenu
                        actions={[
                          { label: 'Edit', onClick: () => setModalOrder(o) },
                          ...(balance > 0 ? [{ label: 'Record Payment', onClick: () => setPaymentOrder(o) }] : []),
                          { label: 'Download Customer Receipt', onClick: () => handleDownloadCustomerReceipt(o) },
                          { label: 'Download Tailor Receipt(s)', onClick: () => handleDownloadTailorReceipts(o) },
                          { label: 'Delete', danger: true, onClick: () => handleDelete(o) },
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-row">
                    {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOrder !== undefined && (
        <OrderModal order={modalOrder} onClose={() => setModalOrder(undefined)} />
      )}

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          customer={customerMap.get(paymentOrder.customer_id)}
          itemsSummary={itemsSummary(itemsByOrder.get(paymentOrder.id) ?? [])}
          onClose={() => setPaymentOrder(null)}
        />
      )}
    </div>
  )
}
