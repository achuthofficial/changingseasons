import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Navbar from './Navbar.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { sweepOrphanedImages } from '../utils/storageCleanup.js'
import './Layout.css'

const SWEEP_KEY = 'change-seasons-last-image-sweep'
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // The 60-minute purge runs inside Postgres and can't reach the storage
  // API, so the design photos of purged orders were left behind until
  // someone remembered to run the sweep by hand. This runs it quietly in
  // the background instead, at most once a day.
  //
  // Safe to run unattended: it aborts rather than guess if it can't read the
  // full list of referenced images, it never touches a file under an hour
  // old (so it can't race an upload whose row hasn't been written yet), and
  // photos on soft-deleted-but-restorable orders still count as referenced.
  //
  // Lives here rather than in App so it only runs for a signed-in admin —
  // the storage policies require a session. Failures are logged and ignored;
  // cleanup must never interrupt someone trying to work.
  useEffect(() => {
    let last = 0
    try {
      last = Number(localStorage.getItem(SWEEP_KEY)) || 0
    } catch {
      // Blocked storage — treat as never swept and carry on.
    }
    if (Date.now() - last < SWEEP_INTERVAL_MS) return

    // Stamped before the sweep starts, not after, so two tabs opening
    // together don't both run it.
    try {
      localStorage.setItem(SWEEP_KEY, String(Date.now()))
    } catch {
      // Private browsing or blocked storage — the sweep still runs, it just
      // isn't throttled. The manual button in the profile menu also remains.
    }

    sweepOrphanedImages()
      .then(({ removed, failures }) => {
        if (removed > 0) console.info(`[imageSweep] removed ${removed} unused image(s)`)
        if (failures.length > 0) console.warn('[imageSweep] partial failures:', failures.join(' · '))
      })
      .catch((err) => console.warn('[imageSweep] skipped:', err.message))
  }, [])

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
