import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import RowMenu from '../components/RowMenu.jsx'
import StaffModal from '../components/StaffModal.jsx'
import { IconStaff } from '../components/Icons.jsx'
import { useStaff } from '../hooks/useStaff.js'
import { supabase } from '../lib/supabaseClient.js'

export default function Staff() {
  const { staff, mutate } = useStaff()
  const [modalStaff, setModalStaff] = useState(undefined)

  async function handleDelete(member) {
    const ok = window.confirm(`Remove ${member.name} from staff? Their past orders will keep this assignment on record.`)
    if (!ok) return
    mutate((current) => current.filter((s) => s.id !== member.id))
    const { error } = await supabase.from('staff').delete().eq('id', member.id)
    if (error) window.alert(`Failed to remove staff member: ${error.message}`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>{staff.length} staff members who can be assigned to orders</h2>
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
                  <td className="cell-user-name">{s.name}</td>
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
    </div>
  )
}
