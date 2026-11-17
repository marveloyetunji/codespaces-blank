export const todayStr = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const SLOTS = {
  morning: 'Morning (8am-12pm)',
  afternoon: 'Afternoon (12-4pm)',
  evening: 'Evening (4-7pm)',
}

export const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })

export const fmtPref = (r) =>
  r.preferred_date ? fmtDate(r.preferred_date) + (r.preferred_slot ? ', ' + r.preferred_slot : '') : ''
