export default function Impact({ reports }) {
  if (reports.length === 0) return null
  const by = {}
  reports.forEach((r) => {
    const t = by[r.waste_type] || (by[r.waste_type] = { n: 0, done: 0 })
    t.n++
    if (r.status === 'collected') t.done++
  })
  const rows = Object.entries(by).sort((a, b) => b[1].n - a[1].n)
  const max = Math.max(...rows.map((r) => r[1].n))
  const done = reports.filter((r) => r.status === 'collected').length

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-green-700">Your impact</h2>
        <p className="text-xs text-gray-500">{done} of {reports.length} collected</p>
      </div>
      {rows.map(([type, v]) => (
        <div key={type} className="flex items-center gap-2 text-xs">
          <span className="w-20 truncate text-gray-700">{type}</span>
          <div className="flex-1 h-2.5 bg-green-100 rounded-full overflow-hidden">
            <div className="h-2.5 bg-green-700 rounded-full" style={{ width: (v.done / max) * 100 + '%' }} />
          </div>
          <span className="w-10 text-right text-gray-600">{v.done}/{v.n}</span>
        </div>
      ))}
      <p className="text-[11px] text-gray-400">Dark bar = collected. Light bar = all reports of that type.</p>
    </div>
  )
}
