// Parses a `date`-typed column (e.g. "2026-07-25", no time component) as
// *local* midnight. `new Date(dateStr)` would anchor it to UTC midnight
// instead, which only happens to agree with local-midnight math for
// timezones close to UTC.
export function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole-day difference between a `date`-typed column and today, both
// anchored to local midnight.
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDateOnly(dateStr) - today) / 86400000)
}

// Local (not UTC) calendar-day key for a timestamp, so day-bucketing (e.g. a
// revenue-by-day chart) groups by the day it actually was in the user's
// timezone, not by whatever day UTC happened to be at that instant.
export function localDateKey(dateLike) {
  const d = new Date(dateLike)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
