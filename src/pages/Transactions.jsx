import { useMemo, useState } from 'react'
import Badge from '../components/Badge.jsx'
import RowMenu from '../components/RowMenu.jsx'
import { IconSearch } from '../components/Icons.jsx'
import { useTransactions } from '../hooks/useTransactions.js'
import { useOrders } from '../hooks/useOrders.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatINR } from '../utils/format.js'
import './Transactions.css'

const tabs = ['All', 'Completed', 'Pending', 'Refunded', 'Failed']

export default function Transactions() {
  const { transactions, mutate } = useTransactions()
  const { orders } = useOrders()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesTab = tab === 'All' || t.status === tab
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        t.customer.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        t.item.toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [transactions, query, tab])

  // A Completed, order-linked transaction is what put money onto that
  // order's advance_paid in the first place (PaymentModal / the initial
  // advance on order creation) — deleting the record without reversing that
  // would leave the order's balance permanently understated.
  async function handleDelete(t) {
    const ok = window.confirm(`Delete transaction TXN-${t.id}? This cannot be undone.`)
    if (!ok) return

    mutate((current) => current.filter((row) => row.id !== t.id))
    const { error } = await supabase.from('transactions').delete().eq('id', t.id)

    if (error) {
      window.alert(`Failed to delete transaction: ${error.message}`)
      return
    }

    if (t.order_id && t.status === 'Completed') {
      const order = orders.find((o) => o.id === t.order_id)
      if (order) {
        const revertedAdvance = Math.max(0, Number(order.advance_paid ?? 0) - Number(t.amount))
        const { error: orderError } = await supabase
          .from('orders')
          .update({ advance_paid: revertedAdvance })
          .eq('id', t.order_id)
        if (orderError) {
          window.alert(`Transaction deleted, but updating the order's balance failed: ${orderError.message}`)
        }
      }
    }
  }

  return (
    <div>
      <section className="card">
        <div className="toolbar">
          <label className="toolbar-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Search by customer, item, or transaction ID..."
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
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="mono">TXN-{t.id}</td>
                  <td>
                    <p className="cell-user-name">{t.customer}</p>
                    <p className="cell-user-sub">{t.email}</p>
                  </td>
                  <td>{t.item}</td>
                  <td className="cell-amount">{formatINR(t.amount)}</td>
                  <td>{t.method}</td>
                  <td><Badge status={t.status} /></td>
                  <td>{t.created_at?.slice(0, 10)}</td>
                  <td>
                    <RowMenu actions={[{ label: 'Delete', danger: true, onClick: () => handleDelete(t) }]} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
