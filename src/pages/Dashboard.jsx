import { useMemo, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import RevenueChart from '../components/RevenueChart.jsx'
import MonthlyRevenueChart from '../components/MonthlyRevenueChart.jsx'
import PeriodSelect from '../components/PeriodSelect.jsx'
import Badge from '../components/Badge.jsx'
import { IconRupee, IconBag, IconUsers, IconCard, IconRefund, IconUserPlus, IconAlert } from '../components/Icons.jsx'
import { useUsers } from '../hooks/useUsers.js'
import { useTransactions } from '../hooks/useTransactions.js'
import { useOrders } from '../hooks/useOrders.js'
import { useOrderTrials } from '../hooks/useOrderTrials.js'
import { useOrderItems } from '../hooks/useOrderItems.js'
import { useActivityFeed } from '../hooks/useActivityFeed.js'
import { formatINR } from '../utils/format.js'
import { daysUntil, localDateKey } from '../utils/dateOnly.js'
import { itemsSummary } from '../utils/orderItems.js'
import { periodRange, inRange, monthKey, overlapsRange } from '../utils/period.js'
import './Dashboard.css'

const OPEN_STATUSES = ['Pending', 'In Progress', 'Ready']

const eventIcon = {
  order: IconBag,
  refund: IconRefund,
  customer: IconUserPlus,
  payment: IconCard,
}

const PERIOD_STORAGE_KEY = 'dashboard-period'

function readStoredPeriod() {
  try {
    return window.localStorage.getItem(PERIOD_STORAGE_KEY) || 'this-month'
  } catch {
    return 'this-month'
  }
}

// Every calendar day in [start, end), never running past today.
function daysInRange(start, end) {
  const days = []
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const last = new Date(Math.min(end.getTime() - 1, today.getTime()))
  for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

// The first day of every month from `start`'s month through `end`'s month.
function monthsBetween(start, end) {
  const months = []
  const d = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (d <= last) {
    months.push(new Date(d))
    d.setMonth(d.getMonth() + 1)
  }
  return months
}

export default function Dashboard() {
  const { users } = useUsers()
  const { transactions } = useTransactions()
  const { orders } = useOrders()
  const { trials } = useOrderTrials()
  const { items } = useOrderItems()
  const { events } = useActivityFeed()
  const recentTx = transactions.slice(0, 5)
  const recentEvents = events.slice(0, 5)

  const [period, setPeriod] = useState(readStoredPeriod)
  const range = useMemo(() => periodRange(period), [period])

  function changePeriod(next) {
    setPeriod(next)
    try {
      window.localStorage.setItem(PERIOD_STORAGE_KEY, next)
    } catch {
      // Storage unavailable (private window etc.) — the filter still works.
    }
  }

  const completedTx = useMemo(
    () => transactions.filter((t) => t.status === 'Completed' && t.created_at),
    [transactions],
  )

  const customerMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const ordersMap = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders])

  const itemsByOrder = useMemo(() => {
    const map = new Map()
    for (const i of items) {
      if (!map.has(i.order_id)) map.set(i.order_id, [])
      map.get(i.order_id).push(i)
    }
    return map
  }, [items])

  const dueSoonOrders = useMemo(() => {
    return orders
      .filter((o) => OPEN_STATUSES.includes(o.order_status) && o.due_date)
      .map((o) => ({ ...o, daysUntil: daysUntil(o.due_date) }))
      .filter((o) => o.daysUntil >= 0 && o.daysUntil <= 3)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)
  }, [orders])

  const overdueOrders = useMemo(() => {
    return orders
      .filter((o) => OPEN_STATUSES.includes(o.order_status) && o.due_date)
      .map((o) => ({ ...o, daysUntil: daysUntil(o.due_date) }))
      .filter((o) => o.daysUntil < 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)
  }, [orders])

  const upcomingTrials = useMemo(() => {
    return trials
      .filter((t) => t.status === 'Scheduled' && t.trial_date)
      .map((t) => ({ ...t, daysUntil: daysUntil(t.trial_date) }))
      .filter((t) => t.daysUntil !== null && t.daysUntil >= 0 && t.daysUntil <= 3)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6)
  }, [trials])

  // Every KPI card follows the period filter. An order counts in the
  // period it was booked (its created_at, set from the Booking Date field),
  // revenue in the period the money was received, and customers in the
  // period they were added.
  const stats = useMemo(() => {
    const periodTx = completedTx.filter((t) => inRange(t.created_at, range))
    const revenue = periodTx.reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const periodOrders = orders.filter((o) => inRange(o.created_at, range))
    const bookedValue = periodOrders.reduce((sum, o) => sum + Number(o.quoted_amount || 0), 0)
    const avgOrder = periodOrders.length > 0 ? bookedValue / periodOrders.length : 0
    const isAllTime = !range.start && !range.end
    const customers = isAllTime ? users.length : users.filter((u) => inRange(u.created_at, range)).length
    return {
      revenue,
      orders: periodOrders.length,
      customers,
      avgOrder,
      isAllTime,
    }
  }, [completedTx, users, orders, range])

  // Effective [start, end) of the selected period for charting. "All time"
  // starts at the first month that has any revenue.
  const chartBounds = useMemo(() => {
    const now = new Date()
    let start = range.start
    if (!start) {
      const earliest = completedTx.reduce(
        (min, t) => Math.min(min, new Date(t.created_at).getTime()),
        now.getTime(),
      )
      const e = new Date(earliest)
      start = new Date(e.getFullYear(), e.getMonth(), 1)
    }
    const end = range.end ?? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { start, end }
  }, [range, completedTx])

  // Revenue trend for the selected period: day by day for a period of about
  // two months or less, month by month for anything longer.
  const { revenueSeries, revenueLabels, revenueGranularity } = useMemo(() => {
    const { start, end } = chartBounds
    const spanDays = (end - start) / 86400000
    if (spanDays <= 62) {
      const days = daysInRange(start, end)
      const totals = new Map()
      for (const t of completedTx) {
        const key = localDateKey(t.created_at)
        totals.set(key, (totals.get(key) ?? 0) + Number(t.amount || 0))
      }
      return {
        revenueSeries: days.map((d) => totals.get(localDateKey(d)) ?? 0),
        revenueLabels: days.map((d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        revenueGranularity: 'day',
      }
    }
    const today = new Date()
    const months = monthsBetween(start, new Date(Math.min(end.getTime() - 1, today.getTime())))
    const totals = new Map()
    for (const t of completedTx) {
      const key = monthKey(t.created_at)
      totals.set(key, (totals.get(key) ?? 0) + Number(t.amount || 0))
    }
    return {
      revenueSeries: months.map((d) => totals.get(monthKey(d)) ?? 0),
      revenueLabels: months.map((d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })),
      revenueGranularity: 'month',
    }
  }, [chartBounds, completedTx])

  // Month-wise revenue. A period spanning several months shows exactly
  // those months; a single-month period shows the 12 months up to and
  // including it, with the selected month highlighted.
  const monthlyRevenue = useMemo(() => {
    const today = new Date()
    const { start, end } = chartBounds
    const lastMonth = new Date(Math.min(end.getTime() - 1, today.getTime()))
    let months = monthsBetween(start, lastMonth)
    let highlightAll = true
    if (months.length < 2) {
      const anchor = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
      months = monthsBetween(new Date(anchor.getFullYear(), anchor.getMonth() - 11, 1), anchor)
      highlightAll = false
    }
    const totals = new Map()
    for (const t of completedTx) {
      const key = monthKey(t.created_at)
      totals.set(key, (totals.get(key) ?? 0) + Number(t.amount || 0))
    }
    return months.map((d) => {
      const key = monthKey(d)
      return {
        key,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        fullLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        value: totals.get(key) ?? 0,
        highlighted: highlightAll
          ? false
          : overlapsRange(d, new Date(d.getFullYear(), d.getMonth() + 1, 1), range),
      }
    })
  }, [chartBounds, completedTx, range])

  return (
    <div>
      <div className="dash-filter-bar">
        <div>
          <h2 className="dash-filter-title">Overview</h2>
          <p className="dash-filter-sub">Showing figures for <strong>{range.label}</strong></p>
        </div>
        <div className="dash-filter">
          <span>Period</span>
          <PeriodSelect value={period} onChange={changePeriod} />
        </div>
      </div>

      <div className="stat-grid">
        <StatCard icon={IconRupee} label="Revenue" value={formatINR(stats.revenue)} />
        <StatCard icon={IconBag} label="Orders Booked" value={stats.orders.toLocaleString('en-IN')} />
        <StatCard
          icon={IconUsers}
          label={stats.isAllTime ? 'Customers' : 'New Customers'}
          value={stats.customers.toLocaleString('en-IN')}
        />
        <StatCard icon={IconCard} label="Avg. Order Value" value={formatINR(stats.avgOrder)} />
      </div>

      <div className="dash-grid">
        <section className="card dash-chart-card">
          <div className="card-head">
            <div>
              <h2>Revenue</h2>
              <p>{revenueGranularity === 'day' ? 'Daily' : 'Monthly'} payments received · {range.label}</p>
            </div>
            <span className="chip-select">{range.label}</span>
          </div>
          <RevenueChart data={revenueSeries} labels={revenueLabels} />
        </section>

        <section className="card dash-activity-card">
          <div className="card-head">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest events across the store</p>
            </div>
          </div>
          {recentEvents.length === 0 ? (
            <p className="empty-row">No recent activity yet.</p>
          ) : (
            <ul className="mini-feed">
              {recentEvents.map((ev) => {
                const Icon = eventIcon[ev.type] ?? IconBag
                return (
                  <li key={ev.id}>
                    <span className={`mini-feed-icon type-${ev.type}`}>
                      <Icon size={14} />
                    </span>
                    <div>
                      <p className="mini-feed-title">{ev.title}</p>
                      <p className="mini-feed-detail">{ev.detail}</p>
                      <p className="mini-feed-time">{ev.time}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card dash-table-card">
        <div className="card-head">
          <div>
            <h2>Monthly Revenue</h2>
            <p>Payments received, month by month</p>
          </div>
        </div>
        <MonthlyRevenueChart months={monthlyRevenue} />
      </section>

      <section className="card dash-table-card">
        <div className="card-head">
          <div>
            <h2>Upcoming Deliveries</h2>
            <p>Orders due within the next 3 days</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Garment</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dueSoonOrders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-user-name">{customerMap.get(o.customer_id)?.name ?? 'Unknown'}</td>
                  <td>{itemsSummary(itemsByOrder.get(o.id) ?? [])}</td>
                  <td>{o.due_date} {o.daysUntil === 0 ? '(today)' : `(in ${o.daysUntil}d)`}</td>
                  <td><Badge status={o.order_status} /></td>
                </tr>
              ))}
              {dueSoonOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-row">Nothing due soon.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card dash-table-card">
        <div className="card-head">
          <div>
            <h2>Overdue Orders</h2>
            <p>Orders past their due date that haven't been delivered</p>
          </div>
          {overdueOrders.length > 0 && (
            <span className="chip-select chip-danger">
              <IconAlert size={13} />
              {overdueOrders.length}
            </span>
          )}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Garment</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {overdueOrders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-user-name">{customerMap.get(o.customer_id)?.name ?? 'Unknown'}</td>
                  <td>{itemsSummary(itemsByOrder.get(o.id) ?? [])}</td>
                  <td>{o.due_date} ({Math.abs(o.daysUntil)}d overdue)</td>
                  <td><Badge status={o.order_status} /></td>
                </tr>
              ))}
              {overdueOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-row">Nothing overdue.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card dash-table-card">
        <div className="card-head">
          <div>
            <h2>Upcoming Trials</h2>
            <p>Scheduled fittings in the next 3 days</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Order</th>
                <th>Trial Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingTrials.map((t) => {
                const order = ordersMap.get(t.order_id)
                const customer = order ? customerMap.get(order.customer_id) : null
                return (
                  <tr key={t.id}>
                    <td className="cell-user-name">{customer?.name ?? 'Unknown'}</td>
                    <td className="mono">ORD-{t.order_id}</td>
                    <td>{t.trial_date} {t.daysUntil === 0 ? '(today)' : `(in ${t.daysUntil}d)`}</td>
                    <td><Badge status={t.status} /></td>
                  </tr>
                )
              })}
              {upcomingTrials.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-row">No trials scheduled soon.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card dash-table-card">
        <div className="card-head">
          <div>
            <h2>Recent Transactions</h2>
            <p>Most recent orders placed in the boutique</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Item</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <div className="cell-user">
                      <span className="cell-avatar">{tx.customer.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      <div>
                        <p className="cell-user-name">{tx.customer}</p>
                        <p className="cell-user-sub">TXN-{tx.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>{tx.item}</td>
                  <td className="cell-amount">{formatINR(tx.amount)}</td>
                  <td>{tx.method}</td>
                  <td><Badge status={tx.status} /></td>
                  <td>{tx.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {recentTx.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">No transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
