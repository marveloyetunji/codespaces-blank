import { useState } from 'react'

const COLORS = ['#2E9B47', '#0d9488', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#64748b', '#84cc16', '#db2777']
const fmt = (d) => d.toLocaleDateString('en', { day: 'numeric', month: 'short' })

function Tile({ label, value }) {
  return (
    <div className="bg-green-50 rounded-lg p-2 text-center">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-600">{label}</p>
    </div>
  )
}

function Donut({ data, total }) {
  let acc = 0
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#eef2ee" strokeWidth="6" />
          {data.map(([t, n], i) => {
            const p = (n / total) * 100
            const el = (
              <circle key={t} cx="21" cy="21" r="15.915" fill="none" stroke={COLORS[i % COLORS.length]}
                strokeWidth="6" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-acc} />
            )
            acc += p
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{total}</span>
          <span className="text-[10px] text-gray-500">reports</span>
        </div>
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        {data.map(([t, n], i) => (
          <div key={t} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1 truncate">{t}</span>
            <span className="text-gray-500">{n} · {Math.round((n / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Trend({ reports, days }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pts = [...Array(days)].map((_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const e = new Date(d)
    e.setDate(e.getDate() + 1)
    return { d, n: reports.filter((r) => { const t = new Date(r.created_at); return t >= d && t < e }).length }
  })
  const max = Math.max(1, ...pts.map((p) => p.n))
  const sum = pts.reduce((a, p) => a + p.n, 0)
  const W = 300, H = 90, P = 8
  const x = (i) => P + (i / (days - 1)) * (W - 2 * P)
  const y = (n) => H - P - (n / max) * (H - 2 * P - 8)
  const line = pts.map((p, i) => `${x(i)},${y(p.n)}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
        <polygon points={`${P},${H - P} ${line} ${W - P},${H - P}`} fill="#E3F1E6" />
        <polyline points={line} fill="none" stroke="#2E9B47" strokeWidth="2" strokeLinejoin="round" />
        {days <= 14 && pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.n)} r="2.5" fill="#2E9B47" />)}
        <text x="2" y="8" fontSize="8" fill="#6b7280">{max}</text>
      </svg>
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>{fmt(pts[0].d)}</span>
        <span>{fmt(pts[Math.floor(days / 2)].d)}</span>
        <span>{fmt(pts[days - 1].d)}</span>
      </div>
      <p className="text-xs text-gray-600 mt-1">{sum} new report{sum === 1 ? '' : 's'} in the last {days} days</p>
    </div>
  )
}

export default function Analytics({ reports }) {
  const [days, setDays] = useState(14)
  const list = reports.filter((r) => r.status !== 'cancelled')
  const total = list.length
  const collected = list.filter((r) => r.status === 'collected')
  const rate = total ? Math.round((collected.length / total) * 100) : 0

  const hrs = collected.filter((r) => r.collected_at).map((r) => (new Date(r.collected_at) - new Date(r.created_at)) / 36e5)
  const avg = hrs.length ? (hrs.reduce((a, b) => a + b, 0) / hrs.length).toFixed(1) : '-'
  const rs = list.filter((r) => r.rating)
  const avgR = rs.length ? (rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(1) : '-'

  const by = {}
  list.forEach((r) => { by[r.waste_type] = (by[r.waste_type] || 0) + 1 })
  const types = Object.entries(by).sort((a, b) => b[1] - a[1])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-4">
      <h2 className="font-semibold text-green-700">Analytics</h2>

      <div className="grid grid-cols-4 gap-2">
        <Tile label="Reports" value={total} />
        <Tile label="Collected" value={rate + '%'} />
        <Tile label="Avg hours" value={avg} />
        <Tile label={`Rating (${rs.length})`} value={avgR} />
      </div>

      <div>
        <p className="text-sm font-semibold mb-2">Waste by type</p>
        {types.length === 0
          ? <p className="text-xs text-gray-500">No data yet.</p>
          : <Donut data={types} total={total} />}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold">Reports over time</p>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`text-xs px-2 py-1 rounded ${days === d ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <Trend reports={list} days={days} />
      </div>
    </div>
  )
}
