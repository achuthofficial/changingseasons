import { useMemo, useState } from 'react'
import { formatINR } from '../utils/format.js'

const W = 640
const H = 220
const PAD_X = 8
const PAD_TOP = 18
const PAD_BOTTOM = 30

function buildSmoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const midX = (p0.x + p1.x) / 2
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
  }
  return d
}

export default function RevenueChart({ data, labels }) {
  const [hover, setHover] = useState(null)

  const hasData = data.length >= 2

  const { points, linePath, areaPath } = useMemo(() => {
    if (!hasData) return { points: [], linePath: '', areaPath: '' }

    const max = Math.max(...data)
    const min = Math.min(...data)
    const span = max - min || 1
    const innerW = W - PAD_X * 2
    const innerH = H - PAD_TOP - PAD_BOTTOM

    const points = data.map((v, i) => ({
      x: PAD_X + (i / (data.length - 1)) * innerW,
      y: PAD_TOP + innerH - ((v - min) / span) * innerH,
      value: v,
    }))

    const linePath = buildSmoothPath(points)
    const areaPath =
      `${linePath} L ${points[points.length - 1].x} ${H - PAD_BOTTOM} ` +
      `L ${points[0].x} ${H - PAD_BOTTOM} Z`

    return { points, linePath, areaPath, max, min }
  }, [data, hasData])

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const idx = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))))
    setHover(idx)
  }

  const active = hover !== null ? points[hover] : null

  if (!hasData) {
    return (
      <div className="revenue-chart">
        <div className="revenue-chart-empty">No revenue data yet.</div>
      </div>
    )
  }

  return (
    <div className="revenue-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-400)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-400)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
            y2={PAD_TOP + f * (H - PAD_TOP - PAD_BOTTOM)}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill="url(#revenueFill)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--brand-600)" strokeWidth="2.5" strokeLinecap="round" />

        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke="var(--brand-400)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={active.x} cy={active.y} r="5" fill="var(--white)" stroke="var(--brand-600)" strokeWidth="2.5" />
          </>
        )}
      </svg>

      {active && (
        <div
          className="revenue-tooltip"
          style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
        >
          <strong>{formatINR(active.value)}</strong>
          <span>{labels[hover]}</span>
        </div>
      )}

      <div className="revenue-chart-axis">
        {labels.filter((_, i) => i % 2 === 0).map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  )
}
