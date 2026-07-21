import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconMore } from './Icons.jsx'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import './RowMenu.css'

// actions: [{ label, onClick, danger? }]
export default function RowMenu({ actions }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const coords = useFloatingPosition(open, buttonRef, { width: 190, height: actions.length * 40 + 16 })

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (
        buttonRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="row-menu">
      <button
        ref={buttonRef}
        className="row-more"
        aria-label="More options"
        onClick={() => setOpen((o) => !o)}
      >
        <IconMore size={16} />
      </button>
      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            className="row-menu-list"
            style={{ top: coords.top, right: coords.right }}
          >
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className={`row-menu-item ${a.danger ? 'is-danger' : ''}`}
                onClick={() => {
                  setOpen(false)
                  a.onClick()
                }}
              >
                {a.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
