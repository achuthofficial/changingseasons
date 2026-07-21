import { useMemo, useState } from 'react'
import Badge from '../components/Badge.jsx'
import AddCustomerModal from '../components/AddCustomerModal.jsx'
import { IconSearch, IconUserPlus, IconMore } from '../components/Icons.jsx'
import { useUsers } from '../hooks/useUsers.js'
import { formatINR } from '../utils/format.js'
import './Users.css'

const tabs = ['All', 'Active', 'VIP', 'Inactive']

export default function Users() {
  const { users } = useUsers()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesTab = tab === 'All' || u.status === tab
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q || u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
      return matchesTab && matchesQuery
    })
  }, [users, query, tab])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-copy">
          <h2>{users.length} total customers registered to the boutique</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <IconUserPlus size={16} />
          Add Customer
        </button>
      </div>

      <section className="card">
        <div className="toolbar">
          <label className="toolbar-search">
            <IconSearch size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="pill-tabs">
            {tabs.map((t) => (
              <button
                key={t}
                className={`pill-tab ${tab === t ? 'is-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="cell-user">
                      <span className="cell-avatar">{u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      <div>
                        <p className="cell-user-name">{u.name}</p>
                        <p className="cell-user-sub">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{u.phone}</td>
                  <td>{u.joined}</td>
                  <td>{u.orders}</td>
                  <td className="cell-amount">{formatINR(u.spent)}</td>
                  <td><Badge status={u.status} /></td>
                  <td>
                    <button className="row-more" aria-label="More options">
                      <IconMore size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {users.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <AddCustomerModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
