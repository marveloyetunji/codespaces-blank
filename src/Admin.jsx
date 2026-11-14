import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { exportCsv } from './exportCsv'
import Analytics from './Analytics'
import Users from './Users'
import { supabase } from './supabaseClient'

const HEX = { pending: '#eab308', assigned: '#3b82f6', in_progress: '#f97316', collected: '#16a34a' }
const BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  collected: 'bg-green-100 text-green-800',
}

export default function Admin() {
  const [reports, setReports] = useState([])
  const [collectors, setCollectors] = useState([])

  const load = useCallback(async () => {
    const r = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    setReports(r.data || [])
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

      <div className="h-64 rounded-2xl overflow-hidden shadow">
        <MapContainer key={reports.length ? 'has' : 'none'} center={center}
          zoom={reports.length ? 13 : 6} className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {reports.map((r) => (
            <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={10}
              pathOptions={{ color: HEX[r.status], fillColor: HEX[r.status], fillOpacity: 0.8 }}>
              <Popup>{r.waste_type} · {r.status.replace('_', ' ')}<br />{r.address}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <Users onChange={load} />
      <Analytics reports={reports} />
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-green-800">All reports</h2>
        <button onClick={() => exportCsv(reports, nameOf)} className="text-sm bg-green-700 text-white px-3 py-1 rounded-lg">⬇ Export CSV</button>
      </div>
      {reports.length === 0 && <p className="text-sm text-gray-500">No reports yet.</p>}
      {reports.map((r) => (
        <div key={r.id} className="bg-white p-3 rounded-xl shadow space-y-2">
          <div className="flex gap-3">
            {r.photo_url && <img src={r.photo_url} className="w-16 h-16 object-cover rounded" />}
            {r.proof_url && <img src={r.proof_url} className="w-16 h-16 object-cover rounded border-2 border-green-600" />}
            <div className="flex-1 text-sm">
              <p className="font-semibold">{r.waste_type}</p>
              <p className="text-gray-600">{r.address}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${BADGE[r.status]}`}>
                {r.status.replace('_', ' ')}
              </span>
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
