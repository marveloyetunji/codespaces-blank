export const isUrgent = (r) => r.priority === 'urgent'
export const isOverdue = (r) => {
  if (r.status === 'collected' || r.status === 'rejected') return false
  const hrs = (Date.now() - new Date(r.created_at)) / 36e5
  return hrs > (r.priority === 'urgent' ? 6 : 24)
}
