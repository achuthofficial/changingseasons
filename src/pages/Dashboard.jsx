import { useMemo } from 'react'
import StatCard from '../components/StatCard.jsx'
import RevenueChart from '../components/RevenueChart.jsx'
import Badge from '../components/Badge.jsx'
import { IconRupee, IconBag, IconUsers, IconCard, IconRefund, IconUserPlus, IconAlert } from '../components/Icons.jsx'
import { historyEvents } from '../data/mockData.js'
import { useUsers } from '../hooks/useUsers.js'
import { useTransactions } from '../hooks/useTransactions.js'
import { formatINR } from '../utils/format.js'
import './Dashboard.css'

const eventIcon = {
  order: IconBag,
  refund: IconRefund,
  customer: IconUserPlus,
  inventory: IconAlert,
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
  const recentTx = transactions.slice(0, 5)
  const recentEvents = historyEvents.slice(0, 5)

  const stats = useMemo(() => {
    const completedTx = transactions.filter((t) => t.status === 'Completed')
    const revenue = completedTx.reduce((sum, t) => sum + Number(t.amount), 0)
    const avgOrder = completedTx.length > 0 ? revenue / completedTx.length : 0
    return {
      revenue,
      orders: transactions.length,
      customers: users.length,
      avgOrder,
    }
  }, [transactions, users])

  const { revenueSeries, revenueLabels } = useMemo(() => {
    const days = last14Days()
    const series = days.map((d) => {
      const key = d.toISOString().slice(0, 10)
      return transactions
        .filter((t) => t.status === 'Completed' && t.created_at?.slice(0, 10) === key)
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
