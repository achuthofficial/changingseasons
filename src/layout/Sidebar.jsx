import { NavLink } from 'react-router-dom'
import {
  IconDashboard,
  IconUsers,
  IconBag,
  IconStaff,
  IconTransactions,
  IconWallet,
  IconHistory,
  IconTrash,
  IconLeaf,
  IconX,
} from '../components/Icons.jsx'
import './Sidebar.css'

const links = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/users', label: 'Users', icon: IconUsers },
  { to: '/orders', label: 'Orders', icon: IconBag },
  { to: '/staff', label: 'Staff', icon: IconStaff },
  { to: '/transactions', label: 'Transactions', icon: IconTransactions },
  { to: '/expenses', label: 'Expenses', icon: IconWallet },
  { to: '/history', label: 'History', icon: IconHistory },
  { to: '/recently-deleted', label: 'Recently Deleted', icon: IconTrash },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div className={`sidebar-scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            <IconLeaf size={20} />
          </span>
          <div className="brand-text">
            <strong>Change Seasons</strong>
            <span>Boutique Admin</span>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <IconX size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section">Menu</span>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
