import { useCallback } from 'react'
import { useRealtimeTable } from './useRealtimeTable.js'
import { supabase } from '../lib/supabaseClient.js'

// Expects a `notifications` table: id, message, read (bool), created_at.
export function useRealtimeNotifications() {
  const { rows, loading, error, mutate } = useRealtimeTable('notifications', {
    orderBy: 'created_at',
    ascending: false,
    limit: 20,
  })

  const unreadCount = rows.filter((n) => !n.read).length

  const markAsRead = useCallback(
    async (id) => {
      mutate((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)))
      const { error: updateError } = await supabase.from('notifications').update({ read: true }).eq('id', id)
      if (updateError) console.warn('[useRealtimeNotifications] markAsRead failed:', updateError.message)
    },
    [mutate],
  )

  const markAllAsRead = useCallback(async () => {
    const unreadIds = rows.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    mutate((current) => current.map((n) => (n.read ? n : { ...n, read: true })))
    const { error: updateError } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    if (updateError) console.warn('[useRealtimeNotifications] markAllAsRead failed:', updateError.message)
  }, [rows, mutate])

  return { notifications: rows, unreadCount, loading, error, markAsRead, markAllAsRead }
}
