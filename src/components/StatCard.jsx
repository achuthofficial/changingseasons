// Every card used to carry a "0% vs last period" line with a hardcoded
// upward arrow — the numbers were never computed from anything. A figure
// that looks like a trend but isn't is worse than no figure, so the card
// now shows only the live value it actually knows.
export default function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}
