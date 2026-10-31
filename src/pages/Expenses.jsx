import { useMemo, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import Badge from '../components/Badge.jsx'
import RowMenu from '../components/RowMenu.jsx'
import ExpenseModal from '../components/ExpenseModal.jsx'
import { IconSearch, IconRupee, IconCard, IconWallet, IconRefund } from '../components/Icons.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { RETENTION_MINUTES } from '../hooks/useDeletedRecords.js'
import { expenseCategories, incomeCategories } from '../data/expenseCategories.js'
import { supabase } from '../lib/supabaseClient.js'
import { formatINR } from '../utils/format.js'
import { parseDateOnly } from '../utils/dateOnly.js'
import { periodOptions, periodRange, inRange } from '../utils/period.js'
import './Expenses.css'

const tabs = ['All', 'Expense', 'Income']
const allCategories = [...expenseCategories, ...incomeCategories]

export default function Expenses() {
  const { expenses, mutate } = useExpenses()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')
  const [category, setCategory] = useState('All')
  const [period, setPeriod] = useState('this-month')
  const [modalEntry, setModalEntry] = useState(undefined)
  const { presets: periodPresets, months: periodMonths } = useMemo(() => periodOptions(), [])
  const range = useMemo(() => periodRange(period), [period])

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchesTab = tab === 'All' || e.entry_type === tab
      const matchesCategory = category === 'All' || e.category === category
      // entry_date is a plain date column, so parse it as local midnight.
      const matchesPeriod = e.entry_date ? inRange(parseDateOnly(e.entry_date), range) : !range.start && !range.end
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        e.category.toLowerCase().includes(q) ||
        (e.notes ?? '').toLowerCase().includes(q)
      return matchesTab && matchesCategory && matchesPeriod && matchesQuery
    })
  }, [expenses, tab, category, range, query])

  // The KPI cards summarise exactly the rows the table is showing, so
  // every filter (period, type tab, category, search) moves them too.
  const stats = useMemo(() => {
    let expense = 0
    let income = 0
    for (const e of filtered) {
      const amount = Number(e.amount) || 0
      if (e.entry_type === 'Expense') expense += amount
      if (e.entry_type === 'Income') income += amount
    }
    return { expense, income, net: income - expense, count: filtered.length }
  }, [filtered])

  async function handleDelete(entry) {
    const ok = window.confirm(
      `Move this ${entry.entry_type.toLowerCase()} entry (${entry.category}) to Recently Deleted? ` +
        `You can restore it for the next ${RETENTION_MINUTES} minutes.`,
    )
    if (!ok) return
    const { error } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entry.id)
    if (error) {
      window.alert(`Failed to delete entry: ${error.message}`)
      return
    }
    mutate((current) => current.filter((e) => e.id !== entry.id))
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
        <StatCard icon={IconCard} label={`Expenses · ${range.label}`} value={formatINR(stats.expense)} />
        <StatCard icon={IconWallet} label={`Other Income · ${range.label}`} value={formatINR(stats.income)} />
        <StatCard icon={IconRefund} label={`Net · ${range.label}`} value={formatINR(stats.net)} />
        <StatCard icon={IconRupee} label="Entries" value={stats.count.toLocaleString('en-IN')} />
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
          <select className="expenses-category-filter" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <optgroup label="Quick ranges">
              {periodPresets.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="Pick a month">
              {periodMonths.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </optgroup>
          </select>
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
