import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { relativeTime } from '../utils/relativeTime.js'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import './NotificationsPanel.css'

export default function NotificationsPanel({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onClose, triggerRef }) {
  const panelRef = useRef(null)
  const coords = useFloatingPosition(true, triggerRef, { width: 340, height: 440 })

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
    <div className="notif-panel" ref={panelRef} style={{ top: coords.top, right: coords.right }}>
      <div className="notif-panel-head">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button className="notif-panel-markall" onClick={onMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="notif-panel-list">
        {notifications.length === 0 && <p className="notif-panel-empty">You're all caught up.</p>}
        {notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`notif-item ${n.read ? '' : 'is-unread'}`}
            onClick={() => !n.read && onMarkAsRead(n.id)}
          >
            {!n.read && <span className="notif-item-dot" />}
            <span className="notif-item-body">
              <span className="notif-item-message">{n.message}</span>
              <span className="notif-item-time">{relativeTime(n.created_at)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
