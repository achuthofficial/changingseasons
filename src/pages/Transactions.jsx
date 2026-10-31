import { useMemo, useState } from 'react'
import Badge from '../components/Badge.jsx'
import RowMenu from '../components/RowMenu.jsx'
import { IconSearch } from '../components/Icons.jsx'
import PeriodSelect from '../components/PeriodSelect.jsx'
import { useTransactions } from '../hooks/useTransactions.js'
import { RETENTION_MINUTES } from '../hooks/useDeletedRecords.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatINR } from '../utils/format.js'
import { periodRange, inRange } from '../utils/period.js'
import './Transactions.css'

const tabs = ['All', 'Completed', 'Pending', 'Refunded', 'Failed']

export default function Transactions() {
  const { transactions, mutate } = useTransactions()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')
  const [period, setPeriod] = useState('all')
  const range = useMemo(() => periodRange(period), [period])
  const isAllTime = !range.start && !range.end

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesTab = tab === 'All' || t.status === tab
      const matchesPeriod = isAllTime || inRange(t.created_at, range)
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        t.customer.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        t.item.toLowerCase().includes(q)
      return matchesTab && matchesPeriod && matchesQuery
    })
  }, [transactions, query, tab, range, isAllTime])

  // Money actually received among the rows on screen.
  const filteredTotal = useMemo(
    () => filtered.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [filtered],
  )

  // Soft delete. Reversing the payment back off orders.advance_paid used to
  // happen here, as a second request that could fail on its own and leave
  // the order's balance wrong. It is now a database trigger, so it holds on
  // every path — including a payment swept up in a customer- or order-level
  // cascade — and re-applies automatically when the record is restored.
  async function handleDelete(t) {
    const ok = window.confirm(
      `Move transaction TXN-${t.id} to Recently Deleted? You can restore it for the next ${RETENTION_MINUTES} minutes.`,
    )
    if (!ok) return

    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', t.id)

    if (error) {
      window.alert(`Failed to delete transaction: ${error.message}`)
      return
    }
    mutate((current) => current.filter((row) => row.id !== t.id))
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
          <PeriodSelect value={period} onChange={setPeriod} selectClassName="toolbar-select" />
        </div>
        <p className="toolbar-summary">
          {filtered.length.toLocaleString('en-IN')} transactions · {range.label} · Received{' '}
          <strong>{formatINR(filteredTotal)}</strong>
        </p>

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
                    {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}
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
