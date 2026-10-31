import { useMemo } from 'react'
import { periodOptions, periodRange, customValue } from '../utils/period.js'
import { localDateKey } from '../utils/dateOnly.js'
import './PeriodSelect.css'

// The date filter shared by the Dashboard, Orders, Transactions and
// Expenses pages. The From / To boxes are always on screen: they show the
// dates of whichever quick range is picked, and typing any date there
// switches the filter to that custom range (both days inclusive).
export default function PeriodSelect({ value, onChange, selectClassName = '' }) {
  const { presets, months } = useMemo(() => periodOptions(), [])
  const range = useMemo(() => periodRange(value), [value])
  const today = localDateKey(new Date())

  const isCustom = Boolean(range.custom)
  // The dates the current selection covers, as shown in the boxes.
  const from = range.start ? localDateKey(range.start) : ''
  const to = range.end ? localDateKey(new Date(range.end.getTime() - 1)) : ''

  function setFrom(next) {
    if (!next) return
    onChange(customValue(next, to && to >= next ? to : today))
  }

  function setTo(next) {
    if (!next) return
    onChange(customValue(from && from <= next ? from : next, next))
  }

  return (
    <div className="period-select">
      <select
        className={selectClassName}
        value={isCustom ? 'custom' : value}
        onChange={(e) => {
          // Choosing "Custom dates" keeps the dates already showing, so
          // the admin just edits From / To from there.
          if (e.target.value === 'custom') onChange(customValue(from || today, to || today))
          else onChange(e.target.value)
        }}
      >
        <optgroup label="Quick ranges">
          {presets.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
          <option value="custom">Custom dates</option>
        </optgroup>
        <optgroup label="Pick a month">
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </optgroup>
      </select>

      <div className={`period-custom ${isCustom ? 'is-active' : ''}`}>
        <label>
          <span>From</span>
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}
