import { useState } from 'react'
import { formatINR } from '../utils/format.js'

// Compact rupee label for the top of a bar: ₹1.2L, ₹45K, ₹900.
function shortINR(value) {
  const v = Number(value) || 0
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`
  if (v >= 100000) return `₹${(v / 100000).toFixed(1).replace(/\.0$/, '')}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return `₹${Math.round(v)}`
}

// months: [{ key, label, value, highlighted }]
export default function MonthlyRevenueChart({ months }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(0, ...months.map((m) => m.value))
  const total = months.reduce((sum, m) => sum + m.value, 0)

  if (months.length === 0) {
    return <div className="revenue-chart-empty">No revenue data yet.</div>
  }

  return (
    <div className="monthly-chart">
      <div className="monthly-chart-bars">
        {months.map((m) => {
          const pct = max > 0 ? (m.value / max) * 100 : 0
          return (
            <div
              key={m.key}
              className={`monthly-bar-col ${m.highlighted ? 'is-highlighted' : ''} ${hover === m.key ? 'is-hover' : ''}`}
              onMouseEnter={() => setHover(m.key)}
              onMouseLeave={() => setHover(null)}
              title={`${m.fullLabel}: ${formatINR(m.value)}`}
            >
              <span className="monthly-bar-value">{m.value > 0 ? shortINR(m.value) : ''}</span>
              <div className="monthly-bar-track">
                <div className="monthly-bar" style={{ height: `${Math.max(pct, m.value > 0 ? 2 : 0)}%` }} />
              </div>
              <span className="monthly-bar-label">{m.label}</span>
            </div>
          )
        })}
      </div>
      <div className="monthly-chart-foot">
        <span>Total for these {months.length} months</span>
        <strong>{formatINR(total)}</strong>
      </div>
    </div>
  )
}
