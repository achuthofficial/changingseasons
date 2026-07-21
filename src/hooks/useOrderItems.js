import { useRealtimeTable } from './useRealtimeTable.js'

// Expects an `order_items` table: id, order_id, garment_type,
// garment_type_other, quantity, unit_price, created_at.
export function useOrderItems() {
  const { rows, loading, error, mutate } = useRealtimeTable('order_items', {
    orderBy: 'id',
    ascending: true,
  })

  return { items: rows, loading, error, mutate }
}
