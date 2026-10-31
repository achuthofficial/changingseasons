import { useMemo } from 'react'
import { periodOptions, parseCustom, customValue } from '../utils/period.js'
import { localDateKey } from '../utils/dateOnly.js'
import './PeriodSelect.css'

// The period filter shared by the Dashboard and Expenses pages: quick
// ranges, any of the last 12 months, or a custom From–To range.
export default function PeriodSelect({ value, onChange, selectClassName = '' }) {
  const { presets, months } = useMemo(() => periodOptions(), [])
  const custom = parseCustom(value)
  const today = localDateKey(new Date())

  function handleSelect(next) {
    if (next === 'custom') {
      // Start from the current month so far; the admin then adjusts.
      const now = new Date()
      onChange(customValue(localDateKey(new Date(now.getFullYear(), now.getMonth(), 1)), today))
      return
    }
    onChange(next)
  }

  return (
    <div className="period-select">
      <select
        className={selectClassName}
        value={custom ? 'custom' : value}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <optgroup label="Quick ranges">
          {presets.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
          <option value="custom">Custom range…</option>
        </optgroup>
        <optgroup label="Pick a month">
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </optgroup>
      </select>

      {custom && (
        <div className="period-custom">
          <label>
            <span>From</span>
            <input
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) => e.target.value && onChange(customValue(e.target.value, custom.to))}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              max={today}
              onChange={(e) => e.target.value && onChange(customValue(custom.from, e.target.value))}
            />
          </label>
        </div>
      )}
    </div>
  )
}
