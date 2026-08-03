import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { IconX } from './Icons.jsx'
import { expenseCategories, incomeCategories } from '../data/expenseCategories.js'
import './ExpenseModal.css'

const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer']

function todayDateOnly() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function ExpenseModal({ entry, onClose, onSave }) {
  const isEdit = Boolean(entry)
  const [entryType, setEntryType] = useState(entry?.entry_type ?? 'Expense')
  const categories = entryType === 'Income' ? incomeCategories : expenseCategories
  const [category, setCategory] = useState(entry?.category ?? categories[0])
  const [amount, setAmount] = useState(entry?.amount ?? '')
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? todayDateOnly())
  const [paymentMethod, setPaymentMethod] = useState(entry?.payment_method ?? 'Cash')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isValid = category && Number(amount) > 0 && entryDate

  function handleTypeChange(next) {
    if (next === entryType) return
    setEntryType(next)
    // Category list is type-dependent — jumping types without resetting
    // would leave e.g. "Rent" selected under Income.
    setCategory(next === 'Income' ? incomeCategories[0] : expenseCategories[0])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    const payload = {
      entry_type: entryType,
      category,
      amount: Number(amount),
      entry_date: entryDate,
      payment_method: paymentMethod,
      notes: notes.trim() || null,
    }

    const query = isEdit
      ? supabase.from('expenses').update(payload).eq('id', entry.id)
      : supabase.from('expenses').insert(payload)

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
          <h3>{isEdit ? 'Edit Entry' : 'Add Expense / Income'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="expense-type-toggle">
              <button
                type="button"
                className={`expense-type-btn ${entryType === 'Expense' ? 'is-active is-expense' : ''}`}
                onClick={() => handleTypeChange('Expense')}
              >
                Expense
              </button>
              <button
                type="button"
                className={`expense-type-btn ${entryType === 'Income' ? 'is-active is-income' : ''}`}
                onClick={() => handleTypeChange('Income')}
              >
                Income
              </button>
            </div>

            <label className="modal-field">
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <div className="modal-field-row">
              <label className="modal-field">
                <span>Amount (₹)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </label>

              <label className="modal-field">
                <span>Date</span>
                <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </label>
            </div>

            <label className="modal-field">
              <span>Payment method</span>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>Notes</span>
              <textarea
                placeholder="e.g. July rent, electricity bill..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            {error && <p className="modal-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
