import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import RowMenu from '../components/RowMenu.jsx'
import StaffModal from '../components/StaffModal.jsx'
import { IconStaff, IconX } from '../components/Icons.jsx'
import { useStaff } from '../hooks/useStaff.js'
import { RETENTION_MINUTES } from '../hooks/useDeletedRecords.js'
import { supabase } from '../lib/supabaseClient.js'
import './Staff.css'

export default function Staff() {
  const { staff, mutate } = useStaff()
  const [modalStaff, setModalStaff] = useState(undefined)
  const [previewPhoto, setPreviewPhoto] = useState(null)

  async function handleDelete(member) {
    const ok = window.confirm(
      `Move ${member.name} to Recently Deleted? You can restore them for the next ${RETENTION_MINUTES} minutes.`,
    )
    if (!ok) return
    const { error } = await supabase
      .from('staff')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', member.id)
    if (error) {
      window.alert(`Failed to remove staff member: ${error.message}`)
      return
    }
    mutate((current) => current.filter((s) => s.id !== member.id))
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>{staff.length} staff members on file</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setModalStaff(null)}>
          <IconStaff size={16} />
          Add Staff
        </button>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="cell-user">
                      {s.photo_url ? (
                        <button
                          type="button"
                          className="staff-avatar-btn"
                          onClick={() => setPreviewPhoto({ url: s.photo_url, name: s.name })}
                          aria-label={`View ${s.name}'s photo`}
                        >
                          <img src={s.photo_url} alt={s.name} className="cell-avatar cell-avatar-img" />
                        </button>
                      ) : (
                        <span className="cell-avatar">{s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      )}
                      <p className="cell-user-name">{s.name}</p>
                    </div>
                  </td>
                  <td>{s.phone ?? '—'}</td>
                  <td>{s.role ?? '—'}</td>
                  <td><Badge status={s.active ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <RowMenu
                      actions={[
                        { label: 'Edit', onClick: () => setModalStaff(s) },
                        { label: 'Delete', danger: true, onClick: () => handleDelete(s) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">No staff members yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalStaff !== undefined && (
        <StaffModal staffMember={modalStaff} onClose={() => setModalStaff(undefined)} />
      )}

      {previewPhoto && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setPreviewPhoto(null)}>
          <div className="staff-photo-lightbox">
            <button className="modal-close" onClick={() => setPreviewPhoto(null)} aria-label="Close">
              <IconX size={16} />
            </button>
            <img src={previewPhoto.url} alt={previewPhoto.name} />
            <p>{previewPhoto.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}
