import { useRealtimeTable } from './useRealtimeTable.js'

// Expects a `users` table: id, name, email, phone, alternate_phone, joined,
// orders, spent, status, created_at.
export function useUsers() {
  const { rows, loading, error, mutate } = useRealtimeTable('users', {
    orderBy: 'created_at',
    ascending: false,
    excludeDeleted: true,
  })

  return { users: rows, loading, error, mutate }
}
