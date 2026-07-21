import { IconArrowUp, IconArrowDown } from './Icons.jsx'

export default function StatCard({ icon: Icon, label, value, delta, trend }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className={`stat-delta ${trend}`}>
        {trend === 'up' ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
        {Math.abs(delta)}% vs last period
      </span>
    </div>
  )
}
