import { useMemo, useState } from 'react'
import { IconBag, IconRefund, IconUserPlus, IconCard } from '../components/Icons.jsx'
import { useActivityFeed } from '../hooks/useActivityFeed.js'
import { parseDateOnly } from '../utils/dateOnly.js'
import './History.css'

const typeMeta = {
  order: { icon: IconBag, label: 'Orders' },
  refund: { icon: IconRefund, label: 'Refunds' },
  customer: { icon: IconUserPlus, label: 'Customers' },
  payment: { icon: IconCard, label: 'Payments' },
}

const filters = ['All', 'order', 'refund', 'customer', 'payment']

function formatDay(dateKey) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = parseDateOnly(dateKey)
  const diffDays = Math.round((today - date) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function History() {
  const [filter, setFilter] = useState('All')
  const { events } = useActivityFeed()

  const filtered = useMemo(
    () => (filter === 'All' ? events : events.filter((e) => e.type === filter)),
    [filter, events],
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
            {events.length === 0 ? 'No activity yet.' : 'No activity for this filter.'}
          </p>
        )}
      </section>
    </div>
  )
}
