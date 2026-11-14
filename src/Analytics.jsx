export default function Analytics({ reports }) {
  const total = reports.length
  const collected = reports.filter((r) => r.status === 'collected')
  const rate = total ? Math.round((collected.length / total) * 100) : 0

  const times = collected
    .filter((r) => r.collected_at)
    .map((r) => (new Date(r.collected_at) - new Date(r.created_at)) / 36e5)
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : '-'

  const byType = {}
  reports.forEach((r) => { byType[r.waste_type] = (byType[r.waste_type] || 0) + 1 })
  const types = Object.entries(byType).sort((a, b) => b[1] - a[1])
  const maxT = Math.max(1, ...types.map((t) => t[1]))

  const perDay = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    const e = new Date(d)
    e.setDate(e.getDate() + 1)
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      n: reports.filter((r) => {
        const t = new Date(r.created_at)
        return t >= d && t < e
      }).length,
    }
  })
  const maxD = Math.max(1, ...perDay.map((d) => d.n))

  return (
    <div className="bg-white p-3 rounded-xl shadow space-y-4">
      <h2 className="font-bold text-green-800">Analytics</h2>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-50 rounded-xl p-2">
          <p className="text-xl font-bold">{total}</p>
          <p className="text-[10px] text-gray-600">Total reports</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2">
          <p className="text-xl font-bold">{rate}%</p>
          <p className="text-[10px] text-gray-600">Collected</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2">
          <p className="text-xl font-bold">{avg}</p>
          <p className="text-[10px] text-gray-600">Avg hours to collect</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-1">Waste by type</p>
        {types.length === 0 && <p className="text-xs text-gray-500">No data yet.</p>}
        {types.map(([t, n]) => (
          <div key={t} className="flex items-center gap-2 text-xs mb-1">
            <span className="w-20 truncate">{t}</span>
            <div className="flex-1 bg-gray-100 rounded h-3">
              <div className="bg-green-600 h-3 rounded" style={{ width: (n / maxT) * 100 + '%' }} />
            </div>
            <span className="w-5 text-right">{n}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold mb-1">Reports, last 7 days</p>
        <div className="flex items-end gap-1 h-24">
          {perDay.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[10px]">{d.n}</span>
              <div className="w-full bg-green-600 rounded-t"
                style={{ height: (d.n / maxD) * 70 + '%', minHeight: d.n ? 4 : 0 }} />
              <span className="text-[10px] text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
