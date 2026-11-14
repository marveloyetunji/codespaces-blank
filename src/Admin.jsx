import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { exportCsv } from './exportCsv'
import Analytics from './Analytics'
import Users from './Users'
import { supabase } from './supabaseClient'
import SectionTabs from './SectionTabs'
import { isUrgent, isOverdue } from './priority'
import Timeline from './Timeline'
import LocateControl from './LocateControl'
import { Skeleton, Empty } from './Skeleton'

const HEX = { pending: '#eab308', assigned: '#3b82f6', in_progress: '#f97316', collected: '#16a34a' }
const BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  collected: 'bg-green-100 text-green-800',
}

export default function Admin() {
  const [reports, setReports] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState('active')
  const [collectors, setCollectors] = useState([])
  const [heat, setHeat] = useState(false)
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType] = useState('')
  const [fCol, setFCol] = useState('')

  const load = useCallback(async () => {
    const r = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    setReports(r.data || [])
    setLoaded(true)
    const c = await supabase.from('profiles').select('id,name').eq('role', 'collector')
    setCollectors(c.data || [])
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('admin-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const assign = async (id, collectorId) => {
    await supabase
      .from('reports')
      .update(
        collectorId
          ? { assigned_to: collectorId, status: 'assigned' }
          : { assigned_to: null, status: 'pending' }
      )
      .eq('id', id)
    load()
  }

  const shown = reports.filter((r) =>
    (!fStatus || r.status === fStatus) &&
    (!fType || r.waste_type === fType) &&
    (!fCol || (fCol === 'none' ? !r.assigned_to : r.assigned_to === fCol)) &&
    (!q || ((r.address || '') + ' ' + (r.description || '') + ' ' + r.waste_type).toLowerCase().includes(q.toLowerCase()))
  )
  const types = [...new Set(reports.map((r) => r.waste_type))]
  const cells = {}
  reports.forEach((r) => {
    const k = Math.round(r.lat / 0.003) + ':' + Math.round(r.lng / 0.003)
    const c = cells[k] || (cells[k] = { n: 0, lat: 0, lng: 0, address: r.address })
    c.n++; c.lat += r.lat; c.lng += r.lng
  })
  const hotspots = Object.values(cells)
    .map((c) => ({ ...c, lat: c.lat / c.n, lng: c.lng / c.n }))
    .sort((a, b) => b.n - a.n)
  const count = (s) => reports.filter((r) => r.status === s).length
  const nameOf = (id) => collectors.find((c) => c.id === id)?.name || 'Collector'
  const center = reports[0] ? [reports[0].lat, reports[0].lng] : [9.08, 8.67]

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        {['pending', 'assigned', 'in_progress', 'collected'].map((s) => (
          <div key={s} className={`rounded-xl p-2 ${BADGE[s]}`}>
            <p className="text-xl font-bold">{count(s)}</p>
            <p className="text-[10px]">{s.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      <button onClick={() => setHeat(!heat)}
        className="w-full bg-white border rounded-xl p-2 text-sm font-semibold text-green-800">
        {heat ? '📍 Show report pins only' : '🔥 Show hotspot heatmap'}
      </button>
      {heat && (
        <div className="bg-white p-3 rounded-xl shadow text-sm space-y-1">
          <p className="font-semibold text-green-800">🔥 Top hotspots</p>
          {hotspots.length === 0 && <p className="text-xs text-gray-500">No data yet.</p>}
          {hotspots.slice(0, 3).map((h, i) => (
            <p key={i}>{i + 1}. {h.address || 'Unknown area'} · <b>{h.n}</b> report{h.n > 1 ? 's' : ''}</p>
          ))}
        </div>
      )}
      <div className="h-64 rounded-2xl overflow-hidden shadow">
        <MapContainer key={reports.length ? 'has' : 'none'} center={center}
          zoom={reports.length ? 13 : 6} className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocateControl />
          {heat && hotspots.map((h, i) => (
            <Circle key={i} center={[h.lat, h.lng]} radius={150 + Math.min(h.n, 10) * 60}
              pathOptions={{ stroke: false, fillColor: h.n >= 3 ? '#dc2626' : '#f97316', fillOpacity: 0.3 }} />
          ))}
          {reports.map((r) => (
            <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={10}
              pathOptions={{ color: HEX[r.status], fillColor: HEX[r.status], fillOpacity: 0.8 }}>
              <Popup>{r.waste_type} · {r.status.replace('_', ' ')}<br />{r.address}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      
      <Analytics reports={reports} />
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-green-800">All reports</h2>
        <button onClick={() => exportCsv(reports, nameOf)} className="text-sm bg-green-700 text-white px-3 py-1 rounded-lg">⬇ Export CSV</button>
      </div>
      <div className="bg-white p-3 rounded-xl shadow space-y-2">
        <input className="w-full border rounded-lg p-2 text-sm" placeholder="Search address or description"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <select className="border rounded-lg p-2 text-xs" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="pending">pending</option>
            <option value="assigned">assigned</option>
            <option value="in_progress">in progress</option>
            <option value="collected">collected</option>
          </select>
          <select className="border rounded-lg p-2 text-xs" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">All types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="border rounded-lg p-2 text-xs" value={fCol} onChange={(e) => setFCol(e.target.value)}>
            <option value="">All collectors</option>
            <option value="none">Unassigned</option>
            {collectors.map((c) => <option key={c.id} value={c.id}>{c.name || 'Collector'}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-500">Showing {shown.length} of {reports.length} · <span className="text-red-600">{reports.filter(isOverdue).length} overdue</span></p>
      </div>
      <SectionTabs view={view} setView={setView} loaded={loaded}
        active={reports.filter((x) => x.status !== 'collected').length}
        done={reports.filter((x) => x.status === 'collected').length} />
      {!loaded && <Skeleton />}
      {loaded && reports.length === 0 && <Empty icon="📭" title="No reports yet" text="New citizen reports will appear here." />}
      {shown.filter((x) => (view === 'done' ? x.status === 'collected' : x.status !== 'collected')).map((r) => (
        <div key={r.id} style={isOverdue(r) ? { borderLeft: "4px solid #dc2626" } : undefined} className="bg-white p-3 rounded-xl shadow space-y-2">
          <div className="flex gap-3">
            {r.photo_url && <img src={r.photo_url} className="w-16 h-16 object-cover rounded" />}
            {r.proof_url && <img src={r.proof_url} className="w-16 h-16 object-cover rounded border-2 border-green-600" />}
            <div className="flex-1 text-sm">
              <p className="font-semibold">{r.waste_type}{isUrgent(r) && <span className="ml-2 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full">URGENT</span>}{isOverdue(r) && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⏰ overdue</span>}</p>
              <p className="text-gray-600">{r.address}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${BADGE[r.status]}`}>
                {r.status.replace('_', ' ')}
              </span>
              <Timeline r={r} />
            </div>
          </div>
          {r.status !== 'collected' && (
            <select className="w-full border rounded-lg p-2 text-sm"
              value={r.assigned_to || ''} onChange={(e) => assign(r.id, e.target.value)}>
              <option value="">Unassigned</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>{c.name || 'Collector'}</option>
              ))}
            </select>
          )}
          {r.assigned_to && <p className="text-xs text-gray-500">Assigned to {nameOf(r.assigned_to)}</p>}
        </div>
      ))}
    </div>
  )
}
