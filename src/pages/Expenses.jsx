import { useMemo, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import RowMenu from '../components/RowMenu.jsx'
import ExpenseModal from '../components/ExpenseModal.jsx'
import { IconSearch, IconRupee, IconCard, IconWallet, IconRefund } from '../components/Icons.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { expenseCategories, incomeCategories } from '../data/expenseCategories.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatINR } from '../utils/format.js'
import { parseDateOnly } from '../utils/dateOnly.js'
import './Expenses.css'

const tabs = ['All', 'Expense', 'Income']
const allCategories = [...expenseCategories, ...incomeCategories]

function isToday(dateStr) {
  if (!dateStr) return false
  const d = parseDateOnly(dateStr)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

function isThisMonth(dateStr) {
  if (!dateStr) return false
  const d = parseDateOnly(dateStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
}

export default function Expenses() {
  const { expenses, mutate } = useExpenses()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')
  const [category, setCategory] = useState('All')
  const [modalEntry, setModalEntry] = useState(undefined)

  const stats = useMemo(() => {
    let todayExpense = 0
    let monthExpense = 0
    let monthIncome = 0

    for (const e of expenses) {
      const amount = Number(e.amount) || 0
      if (e.entry_type === 'Expense' && isToday(e.entry_date)) todayExpense += amount
      if (e.entry_type === 'Expense' && isThisMonth(e.entry_date)) monthExpense += amount
      if (e.entry_type === 'Income' && isThisMonth(e.entry_date)) monthIncome += amount
    }

    return {
      todayExpense,
      monthExpense,
      monthIncome,
      netMonth: monthIncome - monthExpense,
    }
  }, [expenses])

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesTab = tab === 'All' || e.entry_type === tab
      const matchesCategory = category === 'All' || e.category === category
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        e.category.toLowerCase().includes(q) ||
        (e.notes ?? '').toLowerCase().includes(q)
      return matchesTab && matchesCategory && matchesQuery
    })
  }, [expenses, tab, category, query])

  async function handleDelete(entry) {
    const ok = window.confirm(`Delete this ${entry.entry_type.toLowerCase()} entry (${entry.category})? This cannot be undone.`)
    if (!ok) return
    mutate((current) => current.filter((e) => e.id !== entry.id))
    const { error } = await supabase.from('expenses').delete().eq('id', entry.id)
    if (error) window.alert(`Failed to delete entry: ${error.message}`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>{expenses.length} expense / income entries on file</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setModalEntry(null)}>
          + Add Entry
        </button>
      </div>

      <div className="stat-grid">
        <StatCard icon={IconRupee} label="Today's Expenses" value={formatINR(stats.todayExpense)} delta={0} trend="up" />
        <StatCard icon={IconCard} label="This Month's Expenses" value={formatINR(stats.monthExpense)} delta={0} trend="up" />
        <StatCard icon={IconWallet} label="This Month's Other Income" value={formatINR(stats.monthIncome)} delta={0} trend="up" />
        <StatCard
          icon={IconRefund}
          label="Net This Month"
          value={formatINR(stats.netMonth)}
          delta={0}
          trend={stats.netMonth >= 0 ? 'up' : 'down'}
        />
      </div>

      <section className="card">
        <div className="toolbar">
          <label className="toolbar-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Search by category or notes..."
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
          <select className="expenses-category-filter" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Notes</th>
                <th>Method</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{e.entry_date}</td>
                  <td><Badge status={e.entry_type} /></td>
                  <td className="cell-user-name">{e.category}</td>
                  <td>{e.notes ?? '—'}</td>
                  <td>{e.payment_method ?? '—'}</td>
                  <td className="cell-amount">{formatINR(e.amount)}</td>
                  <td>
                    <RowMenu
                      actions={[
                        { label: 'Edit', onClick: () => setModalEntry(e) },
                        { label: 'Delete', danger: true, onClick: () => handleDelete(e) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {expenses.length === 0 ? 'No entries yet.' : 'No entries match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalEntry !== undefined && (
        <ExpenseModal entry={modalEntry} onClose={() => setModalEntry(undefined)} />
      )}
    </div>
  )
}
