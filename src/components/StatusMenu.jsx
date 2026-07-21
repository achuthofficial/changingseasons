import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Badge from './Badge.jsx'
import { IconChevronDown } from './Icons.jsx'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import './RowMenu.css'
import './StatusMenu.css'

// A Badge that doubles as a click-to-change status picker.
export default function StatusMenu({ status, options, onSelect }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const coords = useFloatingPosition(open, buttonRef, { width: 190, height: options.length * 40 + 16 })

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

  async function handleSelect(next) {
    setOpen(false)
    if (next === status) return
    await onSelect(next)
  }

  return (
    <div className="status-menu">
      <button
        ref={buttonRef}
        type="button"
        className="status-menu-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <Badge status={status} />
        <IconChevronDown size={13} />
      </button>
      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            className="row-menu-list"
            style={{ top: coords.top, right: coords.right }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className="row-menu-item"
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
