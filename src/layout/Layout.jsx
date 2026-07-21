import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'
import { useTheme } from '../hooks/useTheme.js'
import './Layout.css'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main">
        <Navbar onMenuClick={() => setMenuOpen(true)} theme={theme} onToggleTheme={toggleTheme} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
