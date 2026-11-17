export const isUrgent = (r) => r.priority === 'urgent'
export const isOverdue = (r) => {
  if (r.status === 'collected' || r.status === 'rejected') return false
  const from = r.preferred_date ? Math.max(new Date(r.created_at), new Date(r.preferred_date)) : new Date(r.created_at)
  const hrs = (Date.now() - from) / 36e5
  return hrs > (r.priority === 'urgent' ? 6 : 24)
}
