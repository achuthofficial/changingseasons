import { useMemo, useState } from 'react'
import { IconBag, IconRefund, IconUserPlus, IconAlert, IconCard } from '../components/Icons.jsx'
import { historyEvents } from '../data/mockData.js'
import './History.css'

const typeMeta = {
  order: { icon: IconBag, label: 'Orders' },
  refund: { icon: IconRefund, label: 'Refunds' },
  customer: { icon: IconUserPlus, label: 'Customers' },
  inventory: { icon: IconAlert, label: 'Inventory' },
  payment: { icon: IconCard, label: 'Payments' },
}

const filters = ['All', 'order', 'refund', 'customer', 'inventory', 'payment']

function formatDay(dateStr) {
  const today = new Date('2026-07-20')
  const date = new Date(dateStr)
  const diffDays = Math.round((today - date) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function History() {
  const [filter, setFilter] = useState('All')

  const filtered = useMemo(
    () => (filter === 'All' ? historyEvents : historyEvents.filter((e) => e.type === filter)),
    [filter],
  )

  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach((ev) => {
      const key = ev.date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(ev)
    })
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>A complete log of orders, payments, and account activity</h2>
        </div>
        <div className="pill-tabs">
          {filters.map((f) => (
            <button
              key={f}
              className={`pill-tab ${filter === f ? 'is-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'All' ? 'All' : typeMeta[f].label}
            </button>
          ))}
        </div>
      </div>

      <section className="card timeline-card">
        {grouped.map(([date, events]) => (
          <div className="timeline-group" key={date}>
            <div className="timeline-date">{formatDay(date)}</div>
            <ul className="timeline">
              {events.map((ev) => {
                const Icon = typeMeta[ev.type].icon
                return (
                  <li key={ev.id} className="timeline-item">
                    <span className={`timeline-icon type-${ev.type}`}>
                      <Icon size={15} />
                    </span>
                    <div className="timeline-body">
                      <div className="timeline-top">
                        <p className="timeline-title">{ev.title}</p>
                        <span className="timeline-time">{ev.time}</span>
                      </div>
                      <p className="timeline-detail">{ev.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {grouped.length === 0 && (
          <p className="empty-row">
            {historyEvents.length === 0 ? 'No activity yet.' : 'No activity for this filter.'}
          </p>
        )}
      </section>
    </div>
  )
}
