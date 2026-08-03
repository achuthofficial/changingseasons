import { useMemo, useState } from 'react'
import RowMenu from './RowMenu.jsx'
import StatusMenu from './StatusMenu.jsx'
import CustomerModal from './CustomerModal.jsx'
import OrderModal from './OrderModal.jsx'
import PaymentModal from './PaymentModal.jsx'
import { IconX, IconWhatsApp } from './Icons.jsx'
import { useOrders } from '../hooks/useOrders.js'
import { useOrderTrials } from '../hooks/useOrderTrials.js'
import { useOrderItems } from '../hooks/useOrderItems.js'
import { supabase } from '../lib/supabaseClient.js'
import { generateReceiptPdf } from '../utils/generateReceiptPdf.js'
import { formatCustomerId, formatINR } from '../utils/format.js'
import { itemsSummary } from '../utils/orderItems.js'
import { buildWhatsAppLink, orderReadyMessage } from '../utils/whatsapp.js'
import './CustomerDetailModal.css'

const orderStatuses = ['Pending', 'In Progress', 'Ready', 'Delivered', 'Cancelled']
const trialStatuses = ['Scheduled', 'Attended', 'Missed', 'Rescheduled']

export default function CustomerDetailModal({ customer, onClose }) {
  const { orders } = useOrders()
  const { trials } = useOrderTrials()
  const { items } = useOrderItems()
  const [editOpen, setEditOpen] = useState(false)
  // undefined = closed, null = creating a new order, an order object = editing it
  const [orderModal, setOrderModal] = useState(undefined)
  const [paymentOrder, setPaymentOrder] = useState(null)

  const customerOrders = useMemo(
    () =>
      orders
        .filter((o) => o.customer_id === customer.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [orders, customer.id],
  )

  const latestTrialByOrder = useMemo(() => {
    const map = new Map()
    for (const t of trials) {
      const current = map.get(t.order_id)
      if (!current || new Date(t.trial_date ?? 0) >= new Date(current.trial_date ?? 0)) {
        map.set(t.order_id, t)
      }
    }
    return map
  }, [trials])

  const itemsByOrder = useMemo(() => {
    const map = new Map()
    for (const i of items) {
      if (!map.has(i.order_id)) map.set(i.order_id, [])
      map.get(i.order_id).push(i)
    }
    return map
  }, [items])

  async function handleDownloadReceipt(order) {
    try {
      await generateReceiptPdf({
        order,
        customer,
        items: itemsByOrder.get(order.id) ?? [],
      })
    } catch (err) {
      window.alert(`Could not generate receipt: ${err.message}`)
    }
  }

  async function handleOrderStatusChange(order, next) {
    const { error } = await supabase.from('orders').update({ order_status: next }).eq('id', order.id)
    if (error) window.alert(`Failed to update status: ${error.message}`)
  }

  async function handleTrialStatusChange(trial, next) {
    const { error } = await supabase.from('order_trials').update({ status: next }).eq('id', trial.id)
    if (error) window.alert(`Failed to update trial status: ${error.message}`)
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card modal-card-wide">
        <div className="modal-head">
          <h3>{customer.name}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="customer-detail-info">
            <div>
              <p className="cell-user-sub">Customer ID</p>
              <p className="cell-user-name">{formatCustomerId(customer.id)}</p>
            </div>
            <div>
              <p className="cell-user-sub">Phone</p>
              <p className="cell-user-name">{customer.phone}</p>
            </div>
            <div>
              <p className="cell-user-sub">Joined</p>
              <p className="cell-user-name">{customer.joined}</p>
            </div>
            <div className="customer-detail-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)}>
                Edit Customer
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setOrderModal(null)}>
                + New Order
              </button>
            </div>
          </div>

          <div className="modal-section-title">Orders ({customerOrders.length})</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Garment</th>
                  <th>Amount</th>
                  <th>Advance</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Trial</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customerOrders.map((o) => {
                  const orderItems = itemsByOrder.get(o.id) ?? []
                  const balance = Number(o.quoted_amount ?? 0) - Number(o.advance_paid ?? 0)
                  const latestTrial = latestTrialByOrder.get(o.id)
                  return (
                    <tr key={o.id}>
                      <td className="mono">ORD-{o.id}</td>
                      <td>{itemsSummary(orderItems)}</td>
                      <td className="cell-amount">{formatINR(o.quoted_amount)}</td>
                      <td>{formatINR(o.advance_paid ?? 0)}</td>
                      <td className="cell-amount">{formatINR(balance)}</td>
                      <td>{o.due_date ?? '—'}</td>
                      <td>
                        {latestTrial ? (
                          <StatusMenu
                            status={latestTrial.status}
                            options={trialStatuses}
                            onSelect={(next) => handleTrialStatusChange(latestTrial, next)}
                          />
                        ) : (
                          <span className="empty-cell">—</span>
                        )}
                      </td>
                      <td>
                        <div className="status-cell">
                          <StatusMenu
                            status={o.order_status}
                            options={orderStatuses}
                            onSelect={(next) => handleOrderStatusChange(o, next)}
                          />
                          {o.order_status === 'Ready' && customer.phone && (
                            <a
                              className="whatsapp-send-btn"
                              href={buildWhatsAppLink(
                                customer.phone,
                                orderReadyMessage({
                                  customerName: customer.name,
                                  orderId: o.id,
                                  itemsSummary: itemsSummary(orderItems),
                                }),
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <IconWhatsApp size={13} />
                              Send Message
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <RowMenu
                          actions={[
                            { label: 'Edit', onClick: () => setOrderModal(o) },
                            ...(balance > 0 ? [{ label: 'Record Payment', onClick: () => setPaymentOrder(o) }] : []),
                            { label: 'Download Receipt', onClick: () => handleDownloadReceipt(o) },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })}
                {customerOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty-row">No orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editOpen && <CustomerModal customer={customer} onClose={() => setEditOpen(false)} />}

      {orderModal !== undefined && (
        <OrderModal
          order={orderModal}
          initialCustomer={orderModal ? undefined : customer}
          onClose={() => setOrderModal(undefined)}
        />
      )}

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          customer={customer}
          itemsSummary={itemsSummary(itemsByOrder.get(paymentOrder.id) ?? [])}
          onClose={() => setPaymentOrder(null)}
        />
      )}
    </div>
  )
}
