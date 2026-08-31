// `status` is rendered by nearly every table. A null/undefined one used to
// throw on .toLowerCase(), which takes down the whole page rather than one
// cell, so fall back to a dash instead.
export default function Badge({ status }) {
  const label = status == null || status === '' ? '—' : String(status)
  const cls = label.toLowerCase().replace(/\s+/g, '-')
  return <span className={`badge badge-${cls}`}>{label}</span>
}
