import { useRealtimeTable } from './useRealtimeTable.js'

// Expects a `transactions` table: id, customer, email, item, amount, method, status, created_at.
export function useTransactions() {
  const { rows, loading, error, mutate } = useRealtimeTable('transactions', {
    orderBy: 'created_at',
    ascending: false,
  })

  return { transactions: rows, loading, error, mutate }
}
