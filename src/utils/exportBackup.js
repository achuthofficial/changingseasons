import { supabase } from '../lib/supabaseClient.js'

// Every table the app writes to. Kept as one flat list here rather than
// pulled from Supabase's own catalog, since that would need a service-role
// key this client-side app never has — the anon/publishable key can only
// see tables RLS grants it, which is exactly the set below anyway.
const TABLES = [
  'users',
  'orders',
  'order_items',
  'order_trials',
  'staff',
  'transactions',
  'notifications',
  'expenses',
]

// Exports every table to one JSON file and triggers a browser download —
// an on-demand manual backup. Doesn't abort on a single table's failure
// (e.g. a table that doesn't exist yet in an older project) so a partial
// export still comes down instead of nothing; failures are reported back
// to the caller to surface to the admin.
export async function downloadBackup() {
  const tables = {}
  const failures = []

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      failures.push(`${table}: ${error.message}`)
      continue
    }
    tables[table] = data ?? []
  }

  const backup = {
    generated_at: new Date().toISOString(),
    tables,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `changingseasons-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  return { failures }
}
