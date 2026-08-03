import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconMenu, IconSearch, IconBell, IconChevronDown, IconSun, IconMoon } from '../components/Icons.jsx'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications.js'
import { useUsers } from '../hooks/useUsers.js'
import { useOrders } from '../hooks/useOrders.js'
import { useOrderItems } from '../hooks/useOrderItems.js'
import { useAuth } from '../hooks/useAuth.js'
import { formatCustomerId } from '../utils/format.js'
import { garmentLabel, itemsSummary } from '../utils/orderItems.js'
import NotificationsPanel from '../components/NotificationsPanel.jsx'
import NavbarSearchResults from '../components/NavbarSearchResults.jsx'
import ProfileMenu from '../components/ProfileMenu.jsx'
import './Navbar.css'

const pageMeta = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your boutique performance' },
  '/users': { title: 'Users', subtitle: 'Manage your customer base' },
  '/orders': { title: 'Orders', subtitle: 'Garments, measurements, and delivery tracking' },
  '/staff': { title: 'Staff', subtitle: 'Manage your boutique staff' },
  '/transactions': { title: 'Transactions', subtitle: 'Track orders and payments' },
  '/expenses': { title: 'Expenses', subtitle: 'Daily spending and income from outside orders' },
  '/history': { title: 'History', subtitle: 'Recent activity across the store' },
}

export default function Navbar({ onMenuClick, theme, onToggleTheme }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const meta = pageMeta[pathname] ?? pageMeta['/']
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef(null)
  const { user, signOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  const { users } = useUsers()
  const { orders } = useOrders()
  const { items } = useOrderItems()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchBoxRef = useRef(null)

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { customers: [], orders: [] }

    const customerMap = new Map(users.map((u) => [u.id, u]))
    const itemsByOrder = new Map()
    for (const i of items) {
      if (!itemsByOrder.has(i.order_id)) itemsByOrder.set(i.order_id, [])
      itemsByOrder.get(i.order_id).push(i)
    }

    const customers = users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.phone ?? '').toLowerCase().includes(q) ||
          String(u.id) === q ||
          formatCustomerId(u.id).toLowerCase().includes(q),
      )
      .slice(0, 5)

    const matchingOrders = orders
      .filter((o) => {
        const orderItems = itemsByOrder.get(o.id) ?? []
        const customerName = customerMap.get(o.customer_id)?.name ?? ''
        return (
          String(o.id).includes(q) ||
          `ord-${o.id}`.includes(q) ||
          orderItems.some((i) => garmentLabel(i).toLowerCase().includes(q)) ||
          customerName.toLowerCase().includes(q)
        )
      })
      .slice(0, 5)
      .map((o) => ({
        ...o,
        customerName: customerMap.get(o.customer_id)?.name,
        garmentSummary: itemsSummary(itemsByOrder.get(o.id) ?? []),
      }))

    return { customers, orders: matchingOrders }
  }, [query, users, orders, items])

  function handleSelectCustomer(customer) {
    setQuery('')
    setSearchOpen(false)
    navigate(`/users?openCustomer=${customer.id}`)
  }

  function handleSelectOrder(order) {
    setQuery('')
    setSearchOpen(false)
    navigate(`/orders?openOrder=${order.id}`)
  }

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
        <label className="navbar-search" ref={searchBoxRef}>
          <IconSearch size={16} />
          <input
            type="text"
            placeholder="Search orders, customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
          />
        </label>
        {searchOpen && query.trim() && (
          <NavbarSearchResults
            query={query}
            customers={searchResults.customers}
            orders={searchResults.orders}
            onSelectCustomer={handleSelectCustomer}
            onSelectOrder={handleSelectOrder}
            onClose={() => setSearchOpen(false)}
            triggerRef={searchBoxRef}
          />
        )}

        <button
          className="navbar-icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>

        <div className="navbar-notif">
          <button
            ref={bellRef}
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
              triggerRef={bellRef}
            />
          )}
        </div>

        <button
          ref={profileRef}
          className="navbar-profile"
          onClick={() => setProfileOpen((open) => !open)}
        >
          <span className="navbar-avatar">{user?.email?.[0]?.toUpperCase() ?? '?'}</span>
          <span className="navbar-profile-text">
            <strong>{user?.email ?? 'Signed in'}</strong>
            <span>Owner</span>
          </span>
          <IconChevronDown size={15} />
        </button>
        {profileOpen && (
          <ProfileMenu
            email={user?.email}
            onSignOut={signOut}
            onClose={() => setProfileOpen(false)}
            triggerRef={profileRef}
          />
        )}
      </div>
    </header>
  )
}
