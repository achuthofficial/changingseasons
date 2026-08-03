import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconLogout, IconDownload } from './Icons.jsx'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import { downloadBackup } from '../utils/exportBackup.js'
import './ProfileMenu.css'
import './RowMenu.css'

export default function ProfileMenu({ email, onSignOut, onClose, triggerRef }) {
  const panelRef = useRef(null)
  const coords = useFloatingPosition(true, triggerRef, { width: 220, height: 140 })
  const [backingUp, setBackingUp] = useState(false)

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
