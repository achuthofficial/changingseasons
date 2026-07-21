import { useMemo, useState } from 'react'
import Badge from '../components/Badge.jsx'
import StatCard from '../components/StatCard.jsx'
import { IconSearch, IconRupee, IconCard, IconRefund, IconAlert } from '../components/Icons.jsx'
import { useTransactions } from '../hooks/useTransactions.js'
import { formatINR } from '../utils/format.js'
import './Transactions.css'

const tabs = ['All', 'Completed', 'Pending', 'Refunded', 'Failed']

export default function Transactions() {
  const { transactions } = useTransactions()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')

  const summary = useMemo(() => {
    const total = transactions.reduce((sum, t) => (t.status === 'Completed' ? sum + Number(t.amount) : sum), 0)
    const completed = transactions.filter((t) => t.status === 'Completed').length
    const pending = transactions.filter((t) => t.status === 'Pending').length
    const refunded = transactions.filter((t) => t.status === 'Refunded').length
    return { total, completed, pending, refunded }
  }, [transactions])

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

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon={IconRupee} label="Completed Revenue" value={formatINR(summary.total)} delta={0} trend="up" />
        <StatCard icon={IconCard} label="Completed Orders" value={summary.completed} delta={0} trend="up" />
        <StatCard icon={IconAlert} label="Pending" value={summary.pending} delta={0} trend="up" />
        <StatCard icon={IconRefund} label="Refunded" value={summary.refunded} delta={0} trend="up" />
      </div>

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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
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
