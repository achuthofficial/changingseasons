import { useRealtimeTable } from './useRealtimeTable.js'

// Expects an `orders` table: id, customer_id, assigned_to, quoted_amount,
// advance_paid, due_date, designer_instructions, order_status, created_at.
// Garment/quantity/price/measurements/design photo per line item live in the
// `order_items` table (see useOrderItems.js) — each item in an order can
// have its own measurements and design reference photo.
export function useOrders() {
  const { rows, loading, error, mutate } = useRealtimeTable('orders', {
    orderBy: 'created_at',
    ascending: false,
  })

  return { orders: rows, loading, error, mutate }
}
