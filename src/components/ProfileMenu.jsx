import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconLogout } from './Icons.jsx'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import './ProfileMenu.css'
import './RowMenu.css'

export default function ProfileMenu({ email, onSignOut, onClose, triggerRef }) {
  const panelRef = useRef(null)
  const coords = useFloatingPosition(true, triggerRef, { width: 220, height: 96 })

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
