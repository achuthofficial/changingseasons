import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import { IconTrash, IconAlert } from '../components/Icons.jsx'
import { useDeletedRecords, RETENTION_MINUTES } from '../hooks/useDeletedRecords.js'
import { relativeTime } from '../utils/relativeTime.js'
import './RecentlyDeleted.css'

// mm:ss while under an hour — a bare "in 59 minutes" hides how close to
// gone something is when it matters most.
function countdown(expiresAt, now) {
  const remaining = Math.max(0, expiresAt - now)
  const totalSeconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function RecentlyDeleted() {
  const { records, loading, failures, now, restore, purgeNow } = useDeletedRecords()
  // Which row is mid-action, so its own buttons disable without freezing
  // the whole table.
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState(null)

  async function handleRestore(record) {
    setBusyKey(record.key)
    setError(null)
    const { error: restoreError } = await restore(record)
    if (restoreError) setError(`Could not restore ${record.title}: ${restoreError}`)
    setBusyKey(null)
  }

  async function handlePurge(record) {
    const ok = window.confirm(
      `Permanently delete ${record.title}? This removes it immediately and cannot be undone.`,
    )
    if (!ok) return
    setBusyKey(record.key)
    setError(null)
    const { error: purgeError } = await purgeNow(record)
    if (purgeError) setError(`Could not delete ${record.title}: ${purgeError}`)
    setBusyKey(null)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>
            {loading
              ? 'Loading recently deleted records...'
              : `${records.length} record${records.length === 1 ? '' : 's'} recoverable`}
          </h2>
          <p className="page-header-sub">
            Anything deleted in the last {RETENTION_MINUTES} minutes can be restored here. After
            that it is permanently removed automatically.
          </p>
        </div>
      </div>

      {failures.length > 0 && (
        <div className="card deleted-warning">
          <IconAlert size={16} />
          <div>
            <strong>Some records could not be loaded.</strong>
            <p>{failures.join(' · ')}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card deleted-warning">
          <IconAlert size={16} />
          <div>
            <strong>{error}</strong>
          </div>
        </div>
      )}

      <section className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Record</th>
                <th>Details</th>
                <th>Deleted</th>
                <th>Removed in</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const remaining = record.expiresAt - now
                // Under five minutes left is worth making obvious.
                const urgent = remaining < 5 * 60 * 1000
                const busy = busyKey === record.key
                return (
                  <tr key={record.key}>
                    <td>
                      <Badge status={record.type} />
                    </td>
                    <td className="cell-user-name">{record.title}</td>
                    <td>{record.detail || '—'}</td>
                    <td>{relativeTime(record.deletedAt)}</td>
                    <td className={`deleted-countdown ${urgent ? 'is-urgent' : ''}`}>
                      {countdown(record.expiresAt, now)}
                    </td>
                    <td>
                      <div className="deleted-actions">
                        <button
                          type="button"
                          className="btn btn-primary deleted-restore-btn"
                          onClick={() => handleRestore(record)}
                          disabled={busy}
                        >
                          {busy ? 'Working...' : 'Restore'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost deleted-purge-btn"
                          onClick={() => handlePurge(record)}
                          disabled={busy}
                        >
                          Delete now
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    <span className="deleted-empty">
                      <IconTrash size={18} />
                      Nothing has been deleted in the last {RETENTION_MINUTES} minutes.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
