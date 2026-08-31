import { useRealtimeTable } from './useRealtimeTable.js'

// Expects an `expenses` table: id, entry_type ('Expense' | 'Income'),
// category, amount, entry_date, payment_method, notes, created_at.
// Covers day-to-day boutique spending and income from outside orders —
// order-linked payments still live in `transactions` (see useTransactions.js).
export function useExpenses() {
  const { rows, loading, error, mutate } = useRealtimeTable('expenses', {
    orderBy: 'entry_date',
    ascending: false,
    excludeDeleted: true,
  })

  return { expenses: rows, loading, error, mutate }
}
