import { useMemo } from 'react'
import StatCard from '../components/StatCard.jsx'
import RevenueChart from '../components/RevenueChart.jsx'
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
import './Dashboard.css'

const OPEN_STATUSES = ['Pending', 'In Progress', 'Ready']

const eventIcon = {
  order: IconBag,
  refund: IconRefund,
  customer: IconUserPlus,
  payment: IconCard,
}

function last14Days() {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
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

  const stats = useMemo(() => {
    const completedTx = transactions.filter((t) => t.status === 'Completed')
    const revenue = completedTx.reduce((sum, t) => sum + Number(t.amount), 0)
    const avgOrder = completedTx.length > 0 ? revenue / completedTx.length : 0
    return {
      revenue,
      orders: orders.length,
      customers: users.length,
      avgOrder,
    }
  }, [transactions, users, orders])

  const { revenueSeries, revenueLabels } = useMemo(() => {
    const days = last14Days()
    const series = days.map((d) => {
      const key = localDateKey(d)
      return transactions
        .filter((t) => t.status === 'Completed' && t.created_at && localDateKey(t.created_at) === key)
        .reduce((sum, t) => sum + Number(t.amount), 0)
    })
    const labels = days.map((d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    return { revenueSeries: series, revenueLabels: labels }
  }, [transactions])

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon={IconRupee} label="Total Revenue" value={formatINR(stats.revenue)} delta={0} trend="up" />
        <StatCard icon={IconBag} label="Orders" value={stats.orders.toLocaleString('en-IN')} delta={0} trend="up" />
        <StatCard icon={IconUsers} label="Customers" value={stats.customers.toLocaleString('en-IN')} delta={0} trend="up" />
        <StatCard icon={IconCard} label="Avg. Order Value" value={formatINR(stats.avgOrder)} delta={0} trend="up" />
      </div>

      <div className="dash-grid">
        <section className="card dash-chart-card">
          <div className="card-head">
            <div>
              <h2>Revenue</h2>
              <p>Last 14 days of boutique sales</p>
            </div>
            <span className="chip-select">Last 14 days</span>
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
