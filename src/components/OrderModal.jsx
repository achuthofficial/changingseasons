import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { IconX, IconImage } from './Icons.jsx'
import PhoneInput from './PhoneInput.jsx'
import { garmentTypes } from '../data/garmentTypes.js'
import { measurementFields } from '../data/measurementFields.js'
import { useUsers } from '../hooks/useUsers.js'
import { useOrders } from '../hooks/useOrders.js'
import { useOrderTrials } from '../hooks/useOrderTrials.js'
import { useOrderItems } from '../hooks/useOrderItems.js'
import PaymentModal from './PaymentModal.jsx'
import { generateReceiptPdf } from '../utils/generateReceiptPdf.js'
import { formatCustomerId, formatINR } from '../utils/format.js'
import { itemsSummary } from '../utils/orderItems.js'
import './OrderModal.css'

const orderStatuses = ['Pending', 'In Progress', 'Ready', 'Delivered', 'Cancelled']
const trialStatuses = ['Scheduled', 'Attended', 'Missed', 'Rescheduled']
const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer']

let trialTempKey = 0
let itemTempKey = 0

export default function OrderModal({ order, initialCustomer, onClose, onSave }) {
  const isEdit = Boolean(order)
  const { users } = useUsers()
  const { orders: liveOrders } = useOrders()
  const { trials: allTrials, loading: trialsLoading } = useOrderTrials()
  const { items: allItems, loading: itemsLoading } = useOrderItems()

  // Reads live (realtime-synced) data instead of the possibly-stale `order`
  // prop, so the paid-so-far display updates immediately after recording a
  // payment from the nested PaymentModal below, without needing a manual
  // refresh.
  const liveOrder = isEdit ? liveOrders.find((o) => o.id === order.id) ?? order : null

  const initialCustomerId = order?.customer_id ?? initialCustomer?.id ?? null
  const [customerId, setCustomerId] = useState(initialCustomerId)
  // 'selected' (an existing customer chosen), 'search' (typing to find one),
  // or 'new' (filling in a brand-new customer's details right here).
  const [customerMode, setCustomerMode] = useState(initialCustomerId ? 'selected' : 'search')
  const [customerQuery, setCustomerQuery] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAlternatePhone, setNewCustomerAlternatePhone] = useState('')

  // Only meaningful when creating a brand-new order — editing an existing
  // order never writes advance_paid directly anymore, only Record Payment
  // does (see liveOrder/showPayment below).
  const [initialAdvanceAmount, setInitialAdvanceAmount] = useState('')
  const [initialAdvanceMethod, setInitialAdvanceMethod] = useState('Cash')
  const [showPayment, setShowPayment] = useState(false)
  const [dueDate, setDueDate] = useState(order?.due_date ?? '')
  const [designerInstructions, setDesignerInstructions] = useState(order?.designer_instructions ?? '')
  const [orderStatus, setOrderStatus] = useState(order?.order_status ?? 'Pending')
  const [measurements, setMeasurements] = useState(order?.measurements ?? {})

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(order?.design_image_url ?? null)

  const [trials, setTrials] = useState([])
  const trialsInitialized = useRef(false)

  const [items, setItems] = useState([])
  const itemsInitialized = useRef(false)

  const [submitting, setSubmitting] = useState(false)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (trialsInitialized.current) return
    if (isEdit && trialsLoading) return
    trialsInitialized.current = true
    if (isEdit) {
      // One-time sync from the async-loaded trials table into local editable
      // state, guarded by the ref above — same pattern as useRealtimeTable's
      // fetch-in-effect, which this lint rule over-flags.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrials(
        allTrials
          .filter((t) => t.order_id === order.id)
          .map((t) => ({ ...t, _key: t.id })),
      )
    }
  }, [isEdit, trialsLoading, allTrials, order])

  useEffect(() => {
    if (itemsInitialized.current) return
    if (isEdit && itemsLoading) return
    itemsInitialized.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(
      isEdit
        ? allItems.filter((i) => i.order_id === order.id).map((i) => ({ ...i, _key: i.id }))
        : [{ _key: --itemTempKey, id: null, garment_type: garmentTypes[0], garment_type_other: '', quantity: 1, unit_price: '' }],
    )
  }, [isEdit, itemsLoading, allItems, order])

  const selectedCustomer = useMemo(
    () => users.find((u) => u.id === customerId) ?? (customerId === initialCustomer?.id ? initialCustomer : null),
    [users, customerId, initialCustomer],
  )

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return users.slice(0, 8)
    return users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.phone ?? '').toLowerCase().includes(q) ||
          (u.alternate_phone ?? '').toLowerCase().includes(q) ||
          String(u.id) === q,
      )
      .slice(0, 8)
  }, [users, customerQuery])

  function selectCustomer(u) {
    setCustomerId(u.id)
    setCustomerMode('selected')
    setCustomerQuery('')
  }

  function changeCustomer() {
    setCustomerId(null)
    setCustomerMode('search')
    setCustomerQuery('')
  }

  function updateMeasurement(key, value) {
    setMeasurements((m) => ({ ...m, [key]: value }))
  }

  function addTrialRow() {
    trialTempKey -= 1
    setTrials((t) => [...t, { _key: trialTempKey, id: null, trial_date: '', status: 'Scheduled', notes: '' }])
  }

  function updateTrial(key, field, value) {
    setTrials((t) => t.map((row) => (row._key === key ? { ...row, [field]: value } : row)))
  }

  function removeTrial(key) {
    setTrials((t) => t.filter((row) => row._key !== key))
  }

  function addItemRow() {
    itemTempKey -= 1
    setItems((i) => [...i, { _key: itemTempKey, id: null, garment_type: garmentTypes[0], garment_type_other: '', quantity: 1, unit_price: '' }])
  }

  function updateItem(key, field, value) {
    setItems((i) => i.map((row) => (row._key === key ? { ...row, [field]: value } : row)))
  }

  function removeItem(key) {
    setItems((i) => i.filter((row) => row._key !== key))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const computedTotal = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0),
    [items],
  )
  const amountPaid = isEdit ? Number(liveOrder?.advance_paid ?? 0) : Number(initialAdvanceAmount) || 0
  const balanceDue = computedTotal - amountPaid

  const customerValid =
    customerMode === 'new'
      ? Boolean(newCustomerName.trim() && newCustomerPhone.trim())
      : Boolean(customerId)

  const isValid = Boolean(
    customerValid &&
      items.length > 0 &&
      items.every(
        (i) => i.garment_type && (i.garment_type !== 'Other' || (i.garment_type_other ?? '').trim()) && Number(i.quantity) > 0,
      ),
  )

  async function handleDownloadReceipt() {
    setDownloadingReceipt(true)
    setError(null)
    try {
      // Reflects the in-progress form state (not a re-fetch), so a receipt
      // downloaded before hitting "Save Changes" matches what's on screen
      // right now — every field here, not just items/total.
      const previewOrder = {
        ...order,
        due_date: dueDate || null,
        designer_instructions: designerInstructions.trim() || null,
        order_status: orderStatus,
        measurements,
        quoted_amount: computedTotal,
        advance_paid: amountPaid,
        design_image_url: imagePreview,
      }
      await generateReceiptPdf({
        order: previewOrder,
        customer: selectedCustomer,
        // eslint-disable-next-line no-unused-vars
        items: items.map(({ _key, ...rest }) => rest),
      })
    } catch (err) {
      setError(`Could not generate receipt: ${err.message}`)
    } finally {
      setDownloadingReceipt(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    let finalCustomerId = customerId

    if (customerMode === 'new') {
      const { data: newCustomer, error: customerError } = await supabase
        .from('users')
        .insert({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          alternate_phone: newCustomerAlternatePhone.trim() || null,
        })
        .select()
        .single()

      if (customerError) {
        setError(customerError.message)
        setSubmitting(false)
        return
      }
      finalCustomerId = newCustomer.id
      // Switch into "selected" mode immediately: if the order write below
      // fails and the admin retries, we must not insert this customer again.
      setCustomerId(newCustomer.id)
      setCustomerMode('selected')
    }

    let designImageUrl = order?.design_image_url ?? null

    if (imageFile) {
      const path = `${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage.from('order-designs').upload(path, imageFile)
      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('order-designs').getPublicUrl(path)
      designImageUrl = publicUrlData.publicUrl
    }

    const payload = {
      customer_id: finalCustomerId,
      measurements,
      design_image_url: designImageUrl,
      quoted_amount: computedTotal,
      // advance_paid is only ever set here on creation (an optional initial
      // advance) — editing an existing order never touches it, since
      // Record Payment is now the only path that changes it.
      ...(isEdit ? {} : { advance_paid: Number(initialAdvanceAmount) || 0 }),
      due_date: dueDate || null,
      designer_instructions: designerInstructions.trim() || null,
      order_status: orderStatus,
    }

    const query = isEdit
      ? supabase.from('orders').update(payload).eq('id', order.id)
      : supabase.from('orders').insert(payload)

    const { data: savedOrder, error: saveError } = await query.select().single()

    if (saveError) {
      setError(saveError.message)
      setSubmitting(false)
      return
    }

    let advanceLogFailed = false
    if (!isEdit && Number(initialAdvanceAmount) > 0) {
      const customerName = customerMode === 'new' ? newCustomerName.trim() : selectedCustomer?.name ?? 'Unknown'
      const customerEmail = customerMode === 'new' ? null : selectedCustomer?.email ?? null
      const { error: txError } = await supabase.from('transactions').insert({
        order_id: savedOrder.id,
        customer: customerName,
        email: customerEmail,
        item: itemsSummary(items) || `Order ORD-${savedOrder.id}`,
        amount: Number(initialAdvanceAmount),
        method: initialAdvanceMethod,
        status: 'Completed',
      })
      if (txError) {
        advanceLogFailed = true
        setError(`Order created, but the initial advance payment log failed: ${txError.message}`)
      }
    }

    const originalTrials = isEdit ? allTrials.filter((t) => t.order_id === order.id) : []
    const currentIds = new Set(trials.filter((t) => t.id).map((t) => t.id))
    const removed = originalTrials.filter((t) => !currentIds.has(t.id))
    const toInsert = trials.filter((t) => !t.id && t.trial_date)
    const toUpdate = trials.filter((t) => t.id)

    if (removed.length > 0) {
      await supabase.from('order_trials').delete().in('id', removed.map((t) => t.id))
    }
    if (toInsert.length > 0) {
      await supabase.from('order_trials').insert(
        toInsert.map((t) => ({
          order_id: savedOrder.id,
          trial_date: t.trial_date || null,
          status: t.status,
          notes: t.notes?.trim() || null,
        })),
      )
    }
    for (const t of toUpdate) {
      await supabase
        .from('order_trials')
        .update({ trial_date: t.trial_date || null, status: t.status, notes: t.notes?.trim() || null })
        .eq('id', t.id)
    }

    const originalItems = isEdit ? allItems.filter((i) => i.order_id === order.id) : []
    const currentItemIds = new Set(items.filter((i) => i.id).map((i) => i.id))
    const removedItems = originalItems.filter((i) => !currentItemIds.has(i.id))
    const itemsToInsert = items.filter((i) => !i.id)
    const itemsToUpdate = items.filter((i) => i.id)

    if (removedItems.length > 0) {
      await supabase.from('order_items').delete().in('id', removedItems.map((i) => i.id))
    }
    if (itemsToInsert.length > 0) {
      await supabase.from('order_items').insert(
        itemsToInsert.map((i) => ({
          order_id: savedOrder.id,
          garment_type: i.garment_type,
          garment_type_other: i.garment_type === 'Other' ? i.garment_type_other?.trim() || null : null,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
        })),
      )
    }
    for (const i of itemsToUpdate) {
      await supabase
        .from('order_items')
        .update({
          garment_type: i.garment_type,
          garment_type_other: i.garment_type === 'Other' ? i.garment_type_other?.trim() || null : null,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
        })
        .eq('id', i.id)
    }

    setSubmitting(false)
    onSave?.(savedOrder)
    // Keep the modal open if the advance-payment log failed so the error
    // message above is actually visible — the order itself still saved.
    if (!advanceLogFailed) onClose()
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-card-wide">
        <div className="modal-head">
          <h3>{isEdit ? 'Edit Order' : 'New Order'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-field">
              <span>Customer</span>
              {customerMode === 'selected' && selectedCustomer && (
                <div className="order-customer-picked">
                  <div>
                    <p className="cell-user-name">{selectedCustomer.name}</p>
                    <p className="cell-user-sub">{formatCustomerId(selectedCustomer.id)} · {selectedCustomer.phone}</p>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={changeCustomer}>
                    Change
                  </button>
                </div>
              )}

              {customerMode === 'search' && (
                <div className="order-customer-search">
                  <input
                    type="text"
                    placeholder="Search by name, phone, or customer ID..."
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="order-customer-results">
                    {filteredCustomers.map((u) => (
                      <button type="button" key={u.id} className="order-customer-result" onClick={() => selectCustomer(u)}>
                        <span>{u.name}</span>
                        <span className="cell-user-sub">{formatCustomerId(u.id)} · {u.phone}</span>
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <p className="empty-row">No matching customers.</p>
                    )}
                    <button type="button" className="order-customer-add" onClick={() => setCustomerMode('new')}>
                      + Add new customer
                    </button>
                  </div>
                </div>
              )}

              {customerMode === 'new' && (
                <div className="order-customer-new">
                  <div className="modal-field-row">
                    <label className="modal-field">
                      <span>Name</span>
                      <input
                        type="text"
                        placeholder="Customer's full name"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        autoFocus
                      />
                    </label>
                    <label className="modal-field">
                      <span>Phone number</span>
                      <PhoneInput value={newCustomerPhone} onChange={setNewCustomerPhone} />
                    </label>
                  </div>
                  <label className="modal-field">
                    <span>Alternate phone number (optional)</span>
                    <PhoneInput value={newCustomerAlternatePhone} onChange={setNewCustomerAlternatePhone} />
                  </label>
                  <button type="button" className="order-customer-add" onClick={() => setCustomerMode('search')}>
                    ‹ Search existing customer instead
                  </button>
                </div>
              )}
            </div>

            <div className="modal-section-title">Items</div>
            <div className="order-items">
              {items.map((i) => (
                <div className="order-item-row-group" key={i._key}>
                  <div className="order-item-row">
                    <select value={i.garment_type} onChange={(e) => updateItem(i._key, 'garment_type', e.target.value)}>
                      {garmentTypes.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Qty"
                      value={i.quantity}
                      onChange={(e) => updateItem(i._key, 'quantity', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Unit price (₹)"
                      value={i.unit_price}
                      onChange={(e) => updateItem(i._key, 'unit_price', e.target.value)}
                    />
                    <button
                      type="button"
                      className="order-item-remove"
                      onClick={() => removeItem(i._key)}
                      aria-label="Remove item"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                  {i.garment_type === 'Other' && (
                    <input
                      type="text"
                      placeholder="Describe the garment"
                      value={i.garment_type_other}
                      onChange={(e) => updateItem(i._key, 'garment_type_other', e.target.value)}
                    />
                  )}
                </div>
              ))}
              {items.length === 0 && <p className="empty-row">No items added yet.</p>}
              <button type="button" className="btn btn-ghost" onClick={addItemRow}>
                + Add item
              </button>
            </div>

            <div className="modal-field-row">
              <div className="order-balance-due">
                <span>Quoted total</span>
                <strong>{formatINR(computedTotal)}</strong>
              </div>
              {isEdit ? (
                <div className="order-balance-due">
                  <span>Amount paid so far</span>
                  <strong>{formatINR(amountPaid)}</strong>
                </div>
              ) : (
                <label className="modal-field">
                  <span>Advance received now (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={initialAdvanceAmount}
                    onChange={(e) => setInitialAdvanceAmount(e.target.value)}
                  />
                </label>
              )}
            </div>

            {!isEdit && Number(initialAdvanceAmount) > 0 && (
              <label className="modal-field">
                <span>Payment method</span>
                <select value={initialAdvanceMethod} onChange={(e) => setInitialAdvanceMethod(e.target.value)}>
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
            )}

            {isEdit && balanceDue > 0 && (
              <button
                type="button"
                className="btn btn-ghost order-record-payment-btn"
                onClick={() => setShowPayment(true)}
              >
                Record Payment
              </button>
            )}

            <div className="modal-field-row">
              <div className="order-balance-due">
                <span>Balance due</span>
                <strong>{formatINR(balanceDue)}</strong>
              </div>
              <label className="modal-field">
                <span>Due date</span>
                <input type="date" value={dueDate ?? ''} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>

            <label className="modal-field">
              <span>Designer instructions</span>
              <textarea
                placeholder="Notes for the tailor / designer"
                value={designerInstructions}
                onChange={(e) => setDesignerInstructions(e.target.value)}
              />
            </label>

            <label className="modal-field">
              <span>Design reference photo</span>
              <div className="order-image-upload">
                {imagePreview ? (
                  <img src={imagePreview} alt="Design reference" className="order-image-preview" />
                ) : (
                  <div className="order-image-placeholder"><IconImage size={22} /></div>
                )}
                <label className="btn btn-ghost order-image-btn">
                  {imagePreview ? 'Replace image' : 'Upload image'}
                  <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                </label>
              </div>
            </label>

            <div className="modal-section-title">Measurements</div>
            <div className="order-measurements-grid">
              {measurementFields.map((f) => (
                <label className="modal-field" key={f.key}>
                  <span>{f.label}</span>
                  <input
                    type="text"
                    value={measurements[f.key] ?? ''}
                    onChange={(e) => updateMeasurement(f.key, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <label className="modal-field">
              <span>Order status</span>
              <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                {orderStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <div className="modal-section-title">Trial Appointments</div>
            <div className="order-trials">
              {trials.map((t) => (
                <div className="order-trial-row" key={t._key}>
                  <input
                    type="date"
                    value={t.trial_date ?? ''}
                    onChange={(e) => updateTrial(t._key, 'trial_date', e.target.value)}
                  />
                  <select value={t.status} onChange={(e) => updateTrial(t._key, 'status', e.target.value)}>
                    {trialStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Notes"
                    value={t.notes ?? ''}
                    onChange={(e) => updateTrial(t._key, 'notes', e.target.value)}
                  />
                  <button type="button" className="order-trial-remove" onClick={() => removeTrial(t._key)} aria-label="Remove trial">
                    <IconX size={14} />
                  </button>
                </div>
              ))}
              {trials.length === 0 && <p className="empty-row">No trial appointments scheduled.</p>}
              <button type="button" className="btn btn-ghost" onClick={addTrialRow}>
                + Add trial
              </button>
            </div>

            {error && <p className="modal-error">{error}</p>}
          </div>

          <div className="modal-footer">
            {isEdit && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleDownloadReceipt}
                disabled={downloadingReceipt}
              >
                {downloadingReceipt ? 'Preparing...' : 'Download Receipt'}
              </button>
            )}
            <div className="modal-footer-spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>

      {showPayment && liveOrder && (
        <PaymentModal
          // Overrides quoted_amount with the current (possibly unsaved) form
          // total so this always agrees with the "Balance due" shown above,
          // rather than silently falling back to the last-saved figure.
          order={{ ...liveOrder, quoted_amount: computedTotal }}
          customer={selectedCustomer}
          itemsSummary={itemsSummary(items)}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  )
}
