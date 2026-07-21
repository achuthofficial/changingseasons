import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { IconX } from './Icons.jsx'
import './AddCustomerModal.css'

export default function AddCustomerModal({ onClose }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isValid = name.trim() && phone.trim() && item.trim() && Number(amount) > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    const amountNum = Number(amount)

    const { error: userError } = await supabase.from('users').insert({
      name: name.trim(),
      phone: phone.trim(),
      status: 'Active',
      orders: 1,
      spent: amountNum,
    })

    if (userError) {
      setError(userError.message)
      setSubmitting(false)
      return
    }

    const { error: txError } = await supabase.from('transactions').insert({
      customer: name.trim(),
      item: item.trim(),
      amount: amountNum,
      status: 'Completed',
    })

    if (txError) {
      setError(txError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onClose()
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>Add Customer</h3>
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

            <label className="modal-field">
              <span>Item / Garment</span>
              <input
                type="text"
                placeholder="e.g. Silk Wrap Dress"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
            </label>

            <label className="modal-field">
              <span>Amount (₹)</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            {error && <p className="modal-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
