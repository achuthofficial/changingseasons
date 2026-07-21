import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatCustomerId } from '../utils/format.js'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import './NavbarSearchResults.css'

export default function NavbarSearchResults({ query, customers, orders, onSelectCustomer, onSelectOrder, onClose, triggerRef }) {
  const panelRef = useRef(null)
  const coords = useFloatingPosition(true, triggerRef, { width: 340, height: 360 })

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

  const hasResults = customers.length > 0 || orders.length > 0

  return createPortal(
    <div className="navbar-search-panel" ref={panelRef} style={{ top: coords.top, right: coords.right }}>
      {!hasResults && (
        <p className="navbar-search-empty">No results for "{query}"</p>
      )}

      {customers.length > 0 && (
        <div className="navbar-search-section">
          <p className="navbar-search-section-label">Customers</p>
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              className="navbar-search-item"
              onClick={() => onSelectCustomer(c)}
            >
              <span className="navbar-search-item-avatar">
                {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </span>
              <span>
                <span className="navbar-search-item-title">{c.name}</span>
                <span className="navbar-search-item-sub">{formatCustomerId(c.id)} · {c.phone}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {orders.length > 0 && (
        <div className="navbar-search-section">
          <p className="navbar-search-section-label">Orders</p>
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              className="navbar-search-item"
              onClick={() => onSelectOrder(o)}
            >
              <span>
                <span className="navbar-search-item-title">
                  ORD-{o.id} · {o.garmentSummary || 'No items'}
                </span>
                <span className="navbar-search-item-sub">{o.customerName ?? 'Unknown customer'}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
