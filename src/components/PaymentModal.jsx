import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { IconX } from './Icons.jsx'
import { formatINR } from '../utils/format.js'
import './PaymentModal.css'

const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer']

export default function PaymentModal({ order, customer, itemsSummary, onClose }) {
  const balanceDue = Number(order.quoted_amount ?? 0) - Number(order.advance_paid ?? 0)

  const [amount, setAmount] = useState(balanceDue)
  const [method, setMethod] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isValid = Number(amount) > 0 && Number(amount) <= balanceDue

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    const { error: orderError } = await supabase
      .from('orders')
      .update({ advance_paid: Number(order.advance_paid ?? 0) + Number(amount) })
      .eq('id', order.id)

    if (orderError) {
      setError(orderError.message)
      setSubmitting(false)
      return
    }

    const item = itemsSummary || `Order ORD-${order.id}`

    const { error: txError } = await supabase.from('transactions').insert({
      order_id: order.id,
      customer: customer?.name ?? 'Unknown',
      email: customer?.email ?? null,
      item,
      amount: Number(amount),
      method,
      status: 'Completed',
    })

    if (txError) {
      setError(`Payment recorded on the order, but the transaction log failed: ${txError.message}`)
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
          <h3>Record Payment — ORD-{order.id}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="payment-balance-due">
              <span>Balance due</span>
              <strong>{formatINR(balanceDue)}</strong>
            </div>

            <label className="modal-field">
              <span>Amount received (₹)</span>
              <input
                type="number"
                min="1"
                max={balanceDue}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </label>

            <label className="modal-field">
              <span>Payment method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            {error && <p className="modal-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
