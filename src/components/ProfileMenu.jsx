import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconLogout, IconDownload, IconTrash } from './Icons.jsx'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import { downloadBackup } from '../utils/exportBackup.js'
import { sweepOrphanedImages } from '../utils/storageCleanup.js'
import './ProfileMenu.css'
import './RowMenu.css'

export default function ProfileMenu({ email, onSignOut, onClose, triggerRef }) {
  const panelRef = useRef(null)
  const coords = useFloatingPosition(true, triggerRef, { width: 220, height: 140 })
  const [backingUp, setBackingUp] = useState(false)
  const [sweeping, setSweeping] = useState(false)

  async function handleBackup() {
    if (backingUp) return
    setBackingUp(true)
    try {
      const { failures } = await downloadBackup()
      if (failures.length > 0) {
        window.alert(`Backup downloaded, but some tables failed:\n${failures.join('\n')}`)
      }
    } catch (err) {
      window.alert(`Could not generate backup: ${err.message}`)
    } finally {
      setBackingUp(false)
      onClose()
    }
  }

  // Catches images left behind by the 60-minute purge job, which runs
  // inside Postgres and can't reach the storage API to delete files itself.
  async function handleSweep() {
    if (sweeping) return
    setSweeping(true)
    try {
      const { removed, skippedRecent, failures } = await sweepOrphanedImages()
      const parts = [
        removed === 0 ? 'No unused images found.' : `Deleted ${removed} unused image(s).`,
      ]
      if (skippedRecent > 0) {
        parts.push(`${skippedRecent} recent file(s) were left alone in case they are still in use.`)
      }
      if (failures.length > 0) parts.push(`Problems:\n${failures.join('\n')}`)
      window.alert(parts.join('\n'))
    } catch (err) {
      window.alert(`Could not clean up images: ${err.message}`)
    } finally {
      setSweeping(false)
      onClose()
    }
  }

  useEffect(() => {
    function handlePointerDown(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return
      }
      onClose()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, triggerRef])

  if (!coords) return null

  return createPortal(
    <div className="row-menu-list profile-menu" ref={panelRef} style={{ top: coords.top, right: coords.right }}>
      <div className="profile-menu-email">{email}</div>
      <button type="button" className="row-menu-item" onClick={handleBackup} disabled={backingUp}>
        <IconDownload size={15} />
        {backingUp ? 'Preparing backup...' : 'Download Backup'}
      </button>
      <button type="button" className="row-menu-item" onClick={handleSweep} disabled={sweeping}>
        <IconTrash size={15} />
        {sweeping ? 'Cleaning up...' : 'Clean Up Unused Images'}
      </button>
      <button
        type="button"
        className="row-menu-item is-danger"
        onClick={() => {
          onClose()
          onSignOut()
        }}
      >
        <IconLogout size={15} />
        Sign out
      </button>
    </div>,
    document.body,
  )
}
