import { useRealtimeTable } from './useRealtimeTable.js'

// Expects an `order_trials` table: id, order_id, trial_date, status, notes, created_at.
export function useOrderTrials() {
  const { rows, loading, error, mutate } = useRealtimeTable('order_trials', {
    orderBy: 'trial_date',
    ascending: true,
  })

  return { trials: rows, loading, error, mutate }
}
