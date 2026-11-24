export function ago(t) {
  if (!t) return ''
  const m = Math.floor((Date.now() - new Date(t)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + ' min ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' h ago'
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : d + ' days ago'
}
