import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconMenu, IconSearch, IconBell, IconChevronDown, IconSun, IconMoon } from '../components/Icons.jsx'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications.js'
import NotificationsPanel from '../components/NotificationsPanel.jsx'
import './Navbar.css'

const pageMeta = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your boutique performance' },
  '/users': { title: 'Users', subtitle: 'Manage your customer base' },
  '/transactions': { title: 'Transactions', subtitle: 'Track orders and payments' },
  '/history': { title: 'History', subtitle: 'Recent activity across the store' },
}

export default function Navbar({ onMenuClick, theme, onToggleTheme }) {
  const { pathname } = useLocation()
  const meta = pageMeta[pathname] ?? pageMeta['/']
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <IconMenu size={20} />
        </button>
        <div>
          <h1 className="navbar-title">{meta.title}</h1>
          <p className="navbar-subtitle">{meta.subtitle}</p>
        </div>
      </div>

      <div className="navbar-right">
        <label className="navbar-search">
          <IconSearch size={16} />
          <input type="text" placeholder="Search orders, customers..." />
        </label>

        <button
          className="navbar-icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>

        <div className="navbar-notif">
          <button
            className="navbar-icon-btn"
            onClick={() => setNotifOpen((open) => !open)}
            aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          >
            <IconBell size={18} />
            {unreadCount > 0 && <span className="navbar-dot" />}
          </button>
          {notifOpen && (
            <NotificationsPanel
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        <button className="navbar-profile">
          <span className="navbar-avatar">S</span>
          <span className="navbar-profile-text">
            <strong>Sandhya</strong>
            <span>Owner</span>
          </span>
          <IconChevronDown size={15} />
        </button>
      </div>
    </header>
  )
}
