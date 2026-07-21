import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { IconX } from './Icons.jsx'

export default function CustomerModal({ customer, onClose, onSave }) {
  const isEdit = Boolean(customer)
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isValid = name.trim() && phone.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
    }

    const query = isEdit
      ? supabase.from('users').update(payload).eq('id', customer.id)
      : supabase.from('users').insert(payload)

    const { data, error: saveError } = await query.select().single()

    if (saveError) {
      setError(saveError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSave?.(data)
    onClose()
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>{isEdit ? 'Edit Customer' : 'Add Customer'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="modal-field">
              <span>Name</span>
              <input
                type="text"
                placeholder="Customer's full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>

            <label className="modal-field">
              <span>Phone number</span>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            {error && <p className="modal-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
