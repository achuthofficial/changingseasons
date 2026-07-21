import { useEffect, useRef } from 'react'
import { relativeTime } from '../utils/relativeTime.js'
import './NotificationsPanel.css'

export default function NotificationsPanel({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
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
  }, [onClose])

  return (
    <div className="notif-panel" ref={ref}>
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
    </div>
  )
}
