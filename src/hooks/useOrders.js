import { useRealtimeTable } from './useRealtimeTable.js'

// Expects an `orders` table: id, customer_id, measurements (jsonb),
// design_image_url, assigned_to, quoted_amount, advance_paid, due_date,
// designer_instructions, order_status, created_at. Garment/quantity/price
// line items live in the `order_items` table (see useOrderItems.js).
export function useOrders() {
  const { rows, loading, error, mutate } = useRealtimeTable('orders', {
    orderBy: 'created_at',
    ascending: false,
  })

  return { orders: rows, loading, error, mutate }
}
