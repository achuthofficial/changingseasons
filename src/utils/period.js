// Date-range presets for the dashboard filter. Every range is
// [start, end) in local time; `null` bounds mean "unbounded" (All time).

function startOfMonth(year, month) {
  return new Date(year, month, 1)
}

function monthLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// The preset options shown in the filter dropdown, followed by each of the
// last 12 calendar months so any single month can be picked directly.
export function periodOptions(now = new Date()) {
  const presets = [
    { value: 'this-month', label: 'This month' },
    { value: 'last-month', label: 'Last month' },
    { value: 'last-3-months', label: 'Last 3 months' },
    { value: 'last-6-months', label: 'Last 6 months' },
    { value: 'this-year', label: 'This year' },
    { value: 'all', label: 'All time' },
  ]
  const months = []
  for (let i = 0; i < 12; i++) {
    const d = startOfMonth(now.getFullYear(), now.getMonth() - i)
    months.push({
      value: `month:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: monthLabel(d),
    })
  }
  return { presets, months }
}

export function periodRange(value, now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const nextMonth = startOfMonth(y, m + 1)

  switch (value) {
    case 'this-month':
      return { start: startOfMonth(y, m), end: nextMonth, label: monthLabel(now) }
    case 'last-month': {
      const start = startOfMonth(y, m - 1)
      return { start, end: startOfMonth(y, m), label: monthLabel(start) }
    }
    case 'last-3-months':
      return { start: startOfMonth(y, m - 2), end: nextMonth, label: 'Last 3 months' }
    case 'last-6-months':
      return { start: startOfMonth(y, m - 5), end: nextMonth, label: 'Last 6 months' }
    case 'this-year':
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1), label: String(y) }
    case 'all':
      return { start: null, end: null, label: 'All time' }
    default: {
      const match = /^month:(\d{4})-(\d{2})$/.exec(value ?? '')
      if (match) {
        const start = startOfMonth(Number(match[1]), Number(match[2]) - 1)
        return {
          start,
          end: startOfMonth(start.getFullYear(), start.getMonth() + 1),
          label: monthLabel(start),
        }
      }
      return periodRange('this-month', now)
    }
  }
}

export function inRange(dateLike, { start, end }) {
  if (!dateLike) return false
  const t = new Date(dateLike).getTime()
  if (Number.isNaN(t)) return false
  if (start && t < start.getTime()) return false
  if (end && t >= end.getTime()) return false
  return true
}

// Local "YYYY-MM" key for a timestamp.
export function monthKey(dateLike) {
  const d = new Date(dateLike)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
