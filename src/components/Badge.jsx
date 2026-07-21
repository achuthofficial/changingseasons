export default function Badge({ status }) {
  const cls = status.toLowerCase()
  return <span className={`badge badge-${cls}`}>{status}</span>
}
