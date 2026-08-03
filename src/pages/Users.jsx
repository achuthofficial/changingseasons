import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CustomerModal from '../components/CustomerModal.jsx'
import OrderModal from '../components/OrderModal.jsx'
import CustomerDetailModal from '../components/CustomerDetailModal.jsx'
import RowMenu from '../components/RowMenu.jsx'
import { IconSearch, IconBag } from '../components/Icons.jsx'
import { useUsers } from '../hooks/useUsers.js'
import { useOrders } from '../hooks/useOrders.js'
import { useTransactions } from '../hooks/useTransactions.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatCustomerId, formatINR } from '../utils/format.js'
import './Users.css'

export default function Users() {
  const { users, mutate } = useUsers()
  const { orders } = useOrders()
  const { transactions } = useTransactions()
  const [query, setQuery] = useState('')
  const [modalCustomer, setModalCustomer] = useState(undefined)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderModalCustomer, setOrderModalCustomer] = useState(null)
  const [viewingCustomerId, setViewingCustomerId] = useState(null)
  const viewingCustomer = users.find((u) => u.id === viewingCustomerId) ?? null
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const openId = searchParams.get('openCustomer')
    if (!openId) return
    // Syncing local state from the URL (an external source), same
    // fetch-in-effect shape as useRealtimeTable — this lint rule over-flags it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewingCustomerId(Number(openId))
    setSearchParams(
      (prev) => {
        prev.delete('openCustomer')
        return prev
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

  function openNewOrder(customer = null) {
    setOrderModalCustomer(customer)
    setOrderModalOpen(true)
  }

  // "Orders" and "Total Spent" are derived live from real orders/payments,
  // not a stored field on the customer — a stored count/total would drift
  // out of sync the moment an order or payment happened without someone
  // manually updating it (same class of bug as orders.advance_paid before).
  const orderCustomerMap = useMemo(() => new Map(orders.map((o) => [o.id, o.customer_id])), [orders])

  const orderCountByCustomer = useMemo(() => {
    const map = new Map()
    for (const o of orders) map.set(o.customer_id, (map.get(o.customer_id) ?? 0) + 1)
    return map
  }, [orders])

  const spentByCustomer = useMemo(() => {
    const map = new Map()
    for (const t of transactions) {
      if (t.status !== 'Completed' || !t.order_id) continue
      const customerId = orderCustomerMap.get(t.order_id)
      if (customerId == null) continue
      map.set(customerId, (map.get(customerId) ?? 0) + Number(t.amount))
    }
    return map
  }, [transactions, orderCustomerMap])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase()
      return (
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q) ||
        (u.alternate_phone ?? '').toLowerCase().includes(q) ||
        String(u.id) === q
      )
    })
  }, [users, query])

  async function handleDelete(u) {
    const customerOrderIds = new Set(orders.filter((o) => o.customer_id === u.id).map((o) => o.id))
    const orderCount = customerOrderIds.size
    const txCount = transactions.filter((t) => customerOrderIds.has(t.order_id)).length
    const parts = []
    if (orderCount > 0) parts.push(`${orderCount} order(s)`)
    if (txCount > 0) parts.push(`${txCount} transaction(s)`)
    const warning = parts.length > 0 ? ` This will also delete their ${parts.join(' and ')}.` : ''
    const ok = window.confirm(`Delete customer ${u.name}?${warning} This cannot be undone.`)
    if (!ok) return
    mutate((current) => current.filter((c) => c.id !== u.id))
    const { error } = await supabase.from('users').delete().eq('id', u.id)
    if (error) window.alert(`Failed to delete customer: ${error.message}`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>{users.length} total customers registered to the boutique</h2>
        </div>
        <button className="btn btn-primary" onClick={() => openNewOrder()}>
          <IconBag size={16} />
          New Order
        </button>
      </div>

      <section className="card">
        <div className="toolbar">
          <label className="toolbar-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Search by name, phone, or customer ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{formatCustomerId(u.id)}</td>
                  <td>
                    <button type="button" className="cell-user cell-user-link" onClick={() => setViewingCustomerId(u.id)}>
                      <span className="cell-avatar">{u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      <div>
                        <p className="cell-user-name">{u.name}</p>
                        <p className="cell-user-sub">{u.email}</p>
                      </div>
                    </button>
                  </td>
                  <td>
                    <p>{u.phone}</p>
                    {u.alternate_phone && <p className="cell-user-sub">{u.alternate_phone}</p>}
                  </td>
                  <td>{u.joined}</td>
                  <td>{orderCountByCustomer.get(u.id) ?? 0}</td>
                  <td className="cell-amount">{formatINR(spentByCustomer.get(u.id) ?? 0)}</td>
                  <td>
                    <RowMenu
                      actions={[
                        { label: 'Edit', onClick: () => setModalCustomer(u) },
                        { label: 'New Order', onClick: () => openNewOrder(u) },
                        { label: 'Delete', danger: true, onClick: () => handleDelete(u) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {users.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalCustomer !== undefined && (
        <CustomerModal customer={modalCustomer} onClose={() => setModalCustomer(undefined)} />
      )}

      {orderModalOpen && (
        <OrderModal
          initialCustomer={orderModalCustomer ?? undefined}
          onClose={() => setOrderModalOpen(false)}
        />
      )}

      {viewingCustomer && (
        <CustomerDetailModal customer={viewingCustomer} onClose={() => setViewingCustomerId(null)} />
      )}
    </div>
  )
}
