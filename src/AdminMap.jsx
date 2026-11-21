import { useState } from 'react'
import { MapContainer, Marker, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, Flame, Recycle } from 'lucide-react'
import FullMap from './FullMap'
import MapTiles from './MapTiles'
import LocateControl from './LocateControl'
import { MapTabs, Chip, SlideCard, Fit, Focus, Away } from './MapUI'
import { pinIcon } from './mapStyle'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'

const HEX = { pending: '#d97706', approved: '#0d9488', assigned: '#2563eb', in_progress: '#ea580c', collected: '#2E9B47' }
const STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-teal-50 text-teal-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
}
const LABEL = (s) => ({
  pending: 'Received', approved: 'Approved', assigned: 'Collector assigned',
  in_progress: 'Being attended to', collected: 'Completed',
}[s] || s)
const TABS = [['overview', 'Overview'], ['reports', 'Reports'], ['map', 'Map']]
const FILTERS = [
  ['all', 'All', () => true],
  ['pending', 'Received', (r) => r.status === 'pending'],
  ['approved', 'Approved', (r) => r.status === 'approved'],
  ['active', 'With collectors', (r) => ['assigned', 'in_progress'].includes(r.status)],
  ['collected', 'Completed', (r) => r.status === 'collected'],
]

export default function AdminMap({ reports, collectors, page, setPage, onReports }) {
  const [filter, setFilter] = useState('all')
  const [heat, setHeat] = useState(false)
  const [selId, setSelId] = useState(null)

  const base = reports.filter((r) => !['rejected', 'cancelled'].includes(r.status))
  const test = FILTERS.find((f) => f[0] === filter)[2]
  const list = base.filter(test)
  const sel = selId ? list.find((r) => r.id === selId) || null : null
  const pts = list.map((r) => [r.lat, r.lng])
  const center = pts[0] || [9.08, 8.67]

  const cells = {}
  base.filter((r) => r.status !== 'collected').forEach((r) => {
    const k = Math.round(r.lat / 0.003) + ':' + Math.round(r.lng / 0.003)
    const c = cells[k] || (cells[k] = { n: 0, lat: 0, lng: 0, address: r.address })
    c.n++; c.lat += r.lat; c.lng += r.lng
  })
  const hotspots = Object.values(cells)
    .map((c) => ({ ...c, lat: c.lat / c.n, lng: c.lng / c.n }))
    .sort((a, b) => b.n - a.n)

  const colName = sel && sel.assigned_to
    ? (collectors.find((c) => c.id === sel.assigned_to) || {}).name || 'Collector'
    : null

  return (
    <FullMap>
      <MapContainer center={center} zoom={list.length ? 13 : 6} maxZoom={19} className="h-full w-full">
        <MapTiles />
        <Fit pts={pts} />
        <Focus job={sel} />
        <Away onClear={() => setSelId(null)} />
        <LocateControl follow={list.length === 0} bottom={sel ? 270 : 30} />
        {heat && hotspots.map((h, i) => (
          <Circle key={i} center={[h.lat, h.lng]} radius={150 + Math.min(h.n, 10) * 60} interactive={false}
            pathOptions={{ stroke: false, fillColor: h.n >= 3 ? '#dc2626' : '#f97316', fillOpacity: 0.3 }} />
        ))}
        {list.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={pinIcon(HEX[r.status])}
            zIndexOffset={sel && sel.id === r.id ? 1000 : 0}
            eventHandlers={{ click: () => setSelId(r.id) }} />
        ))}
      </MapContainer>

      <div className="absolute top-3 inset-x-3 mx-auto max-w-md space-y-2 pointer-events-none" style={{ zIndex: 1000 }}>
        <MapTabs tabs={TABS} page={page} onChange={setPage} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto pb-1">
          <Chip active={heat} onClick={() => setHeat(!heat)}><Flame size={15} /> Heatmap</Chip>
          {FILTERS.map(([k, label, fn]) => (
            <Chip key={k} active={filter === k} onClick={() => { setFilter(k); setSelId(null) }}>
              {label} ({base.filter(fn).length})
            </Chip>
          ))}
        </div>
      </div>

      {heat && !sel && (
        <div className="absolute left-3 bg-white rounded-xl p-3 text-sm map-float pointer-events-none"
          style={{ bottom: 24, right: 76, zIndex: 1000 }}>
          <p className="font-semibold text-green-700">Top hotspots (open reports)</p>
          {hotspots.length === 0 && <p className="text-xs text-gray-500">No open reports.</p>}
          {hotspots.slice(0, 3).map((h, i) => (
            <p key={i} className="truncate">{i + 1}. {h.address || 'Unknown area'} <b>({h.n})</b></p>
          ))}
        </div>
      )}

      {!sel && !heat && list.length === 0 && (
        <div className="absolute left-3 bg-white rounded-full px-4 py-2 text-sm text-gray-700 map-float pointer-events-none"
          style={{ bottom: 36, zIndex: 1000 }}>
          No reports to show
        </div>
      )}

      {sel && (
        <SlideCard onClose={() => setSelId(null)}>
          <div className="flex gap-3">
            {sel.photo_url
              ? <img src={sel.photo_url} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
              : <div className="w-16 h-16 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Recycle size={24} /></div>}
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold">
                {sel.waste_type}
                {isUrgent(sel) && <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">URGENT</span>}
                {isOverdue(sel) && <span className="ml-1 text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Overdue</span>}
              </p>
              <p className="text-gray-500">{sel.address}</p>
              {sel.preferred_date && <p className="text-xs text-green-700">Preferred: {fmtPref(sel)}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STYLE[sel.status]}`}>{LABEL(sel.status)}</span>
                {colName && <span className="text-xs text-gray-600">{colName}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`}
              target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 border border-green-700 text-green-700 rounded-lg py-3 text-sm font-semibold">
              <Navigation size={16} /> Navigate
            </a>
            <button onClick={() => onReports(sel)}
              className="flex-1 bg-green-700 text-white rounded-lg py-3 text-sm font-semibold">
              Open in Reports
            </button>
          </div>
        </SlideCard>
      )}
    </FullMap>
  )
}
