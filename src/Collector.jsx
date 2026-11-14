import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from './supabaseClient'
import { isUrgent, isOverdue } from './priority'
import LocateControl from './LocateControl'
import { distKm, fmtKm, getPos } from './geo'
import { Skeleton, Empty } from './Skeleton'
import { compressImage } from './compressImage'

const HEX = { assigned: '#3b82f6', in_progress: '#f97316', collected: '#16a34a' }
const BADGE = {
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  collected: 'bg-green-100 text-green-800',
}

export default function Collector() {
  const [jobs, setJobs] = useState([])
  const [pos, setPos] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    setJobs(data || [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('collector-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const start = async (id) => {
    await supabase.from('reports').update({ status: 'in_progress' }).eq('id', id)
    load()
  }

  const finish = async (id, file) => {
    if (!file) return
    setBusyId(id)
    setMsg('')
    try {
      const { data: u } = await supabase.auth.getUser()
      const job = jobs.find((x) => x.id === id)
      const here = await getPos()
      const dist = distKm(here.lat, here.lng, job.lat, job.lng)
      if (dist > 0.1 + Math.min(here.acc, 100) / 1000) {
        setMsg('You are ' + fmtKm(dist) + ' from this report. Move within 100 m to mark it collected.')
        setBusyId(null)
        return
      }
      const path = `${u.user.id}/proof-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('waste-photos')
        .upload(path, await compressImage(file), { contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const proof_url = supabase.storage.from('waste-photos').getPublicUrl(path).data.publicUrl
      const { error } = await supabase
        .from('reports')
        .update({ status: 'collected', proof_url })
        .eq('id', id)
      if (error) throw error
      load()
    } catch (e) {
      setMsg(e.message)
    }
    setBusyId(null)
  }

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const open = jobs.filter((j) => j.status !== 'collected')
  const d = (j) => (pos ? distKm(pos.lat, pos.lng, j.lat, j.lng) : 0)
  const sorted = [...jobs].sort((a, b) => {
    const ca = a.status === 'collected' ? 1 : 0
    const cb = b.status === 'collected' ? 1 : 0
    return ca - cb || (pos ? d(a) - d(b) : 0)
  })
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
          <LocateControl />
          {open.map((j) => (
            <CircleMarker key={j.id} center={[j.lat, j.lng]} radius={10}
              pathOptions={{ color: HEX[j.status], fillColor: HEX[j.status], fillOpacity: 0.8 }}>
              <Popup>{j.waste_type}<br />{j.address}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <h2 className="font-bold text-green-800">My jobs</h2>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      {!loaded && <Skeleton />}
      {loaded && jobs.length === 0 && <Empty icon="🚛" title="No jobs yet" text="Jobs assigned to you by the admin will show here." />}
      {sorted.map((j) => (
        <div key={j.id} style={isOverdue(j) ? { borderLeft: "4px solid #dc2626" } : undefined} className="bg-white p-3 rounded-xl shadow space-y-2">
          <div className="flex gap-3">
            {j.photo_url && <img src={j.photo_url} className="w-16 h-16 object-cover rounded" />}
            {j.proof_url && <img src={j.proof_url} className="w-16 h-16 object-cover rounded border-2 border-green-600" />}
            <div className="flex-1 text-sm">
              <p className="font-semibold">{j.waste_type}{isUrgent(j) && <span className="ml-2 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full">URGENT</span>}{isOverdue(j) && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⏰ overdue</span>}</p>
              <p className="text-gray-600">{j.address}</p>
              {pos && j.status !== 'collected' && (
                <p className="text-xs text-green-700 font-semibold">📍 {fmtKm(d(j))} away</p>
              )}
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

          {j.status === 'assigned' && (
            <button onClick={() => start(j.id)}
              className="w-full bg-green-700 text-white rounded-lg p-3 font-semibold">
              Start collection
            </button>
          )}

          {j.status === 'in_progress' && (
            <label className="block text-center bg-green-700 text-white rounded-lg p-3 font-semibold">
              {busyId === j.id ? 'Uploading...' : '📸 Take proof photo & mark collected'}
              <input type="file" accept="image/*" capture="environment" className="hidden"
                disabled={busyId === j.id}
                onChange={(e) => finish(j.id, e.target.files[0])} />
            </label>
          )}
        </div>
      ))}
    </div>
  )
}
