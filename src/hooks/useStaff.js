import { useRealtimeTable } from './useRealtimeTable.js'

// Expects a `staff` table: id, name, phone, role, active, created_at.
export function useStaff() {
  const { rows, loading, error, mutate } = useRealtimeTable('staff', {
    orderBy: 'name',
    ascending: true,
  })

  return { staff: rows, loading, error, mutate }
}
