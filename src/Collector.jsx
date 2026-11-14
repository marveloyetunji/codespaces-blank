import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from './supabaseClient'

const HEX = { assigned: '#3b82f6', in_progress: '#f97316', collected: '#16a34a' }
const BADGE = {
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  collected: 'bg-green-100 text-green-800',
}
const NEXT = {
  assigned: { status: 'in_progress', label: 'Start collection' },
  in_progress: { status: 'collected', label: 'Mark as collected' },
}

export default function Collector() {
  const [jobs, setJobs] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    setJobs(data || [])
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('collector-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const advance = async (id, status) => {
    await supabase.from('reports').update({ status }).eq('id', id)
    load()
  }

  const open = jobs.filter((j) => j.status !== 'collected')
  const center = jobs[0] ? [jobs[0].lat, jobs[0].lng] : [9.08, 8.67]

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {['assigned', 'in_progress', 'collected'].map((s) => (
          <div key={s} className={`rounded-xl p-2 ${BADGE[s]}`}>
            <p className="text-xl font-bold">{jobs.filter((j) => j.status === s).length}</p>
            <p className="text-[10px]">{s.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      <div className="h-56 rounded-2xl overflow-hidden shadow">
        <MapContainer key={jobs.length ? 'has' : 'none'} center={center}
          zoom={jobs.length ? 13 : 6} className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {open.map((j) => (
            <CircleMarker key={j.id} center={[j.lat, j.lng]} radius={10}
              pathOptions={{ color: HEX[j.status], fillColor: HEX[j.status], fillOpacity: 0.8 }}>
              <Popup>{j.waste_type}<br />{j.address}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <h2 className="font-bold text-green-800">My jobs</h2>
      {jobs.length === 0 && <p className="text-sm text-gray-500">No jobs assigned yet.</p>}
      {jobs.map((j) => (
        <div key={j.id} className="bg-white p-3 rounded-xl shadow space-y-2">
          <div className="flex gap-3">
            {j.photo_url && <img src={j.photo_url} className="w-16 h-16 object-cover rounded" />}
            <div className="flex-1 text-sm">
              <p className="font-semibold">{j.waste_type}</p>
              <p className="text-gray-600">{j.address}</p>
              {j.description && <p className="text-gray-500 text-xs">{j.description}</p>}
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${BADGE[j.status]}`}>
                {j.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <a className="block text-center text-sm text-green-700 border border-green-700 rounded-lg p-2"
            href={`https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lng}`}
            target="_blank" rel="noreferrer">
            🧭 Navigate
          </a>
          {NEXT[j.status] && (
            <button onClick={() => advance(j.id, NEXT[j.status].status)}
              className="w-full bg-green-700 text-white rounded-lg p-3 font-semibold">
              {NEXT[j.status].label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
