// Live data sources. Static seed data has been removed — Dashboard, Users,
// and Transactions now start empty and are ready to be wired to Supabase.

export const stats = {
  revenue: { value: 0, delta: 0, trend: 'up' },
  orders: { value: 0, delta: 0, trend: 'up' },
  customers: { value: 0, delta: 0, trend: 'up' },
  avgOrder: { value: 0, delta: 0, trend: 'up' },
}

export const revenueSeries = []
export const revenueLabels = []

export const users = []

export const transactions = []

export const historyEvents = []
