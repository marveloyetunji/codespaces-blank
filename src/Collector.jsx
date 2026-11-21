import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Recycle, MapPin, ChevronRight } from 'lucide-react'
import { supabase } from './supabaseClient'
import { distKm, fmtKm } from './geo'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'
import Timeline from './Timeline'
import SectionTabs from './SectionTabs'
import LocateControl from './LocateControl'
import LocationBanner from './LocationBanner'
import JobActions from './JobActions'
import TaskDetail from './TaskDetail'
import { Skeleton, Empty } from './Skeleton'

const STYLE = {
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
}
const HEX = { assigned: '#2563eb', in_progress: '#ea580c', collected: '#2E9B47' }
const LABEL = (s) => s.replace('_', ' ')

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function Job({ j, pos, onChanged, onOpen }) {
  const away = pos ? distKm(pos.lat, pos.lng, j.lat, j.lng) : null
  const chip = `px-2 py-1 rounded text-xs font-semibold capitalize ${STYLE[j.status]}`

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2 overflow-hidden"
      style={isOverdue(j) ? { borderLeft: '4px solid #dc2626' } : undefined}>
      <button type="button" onClick={onOpen} className="w-full text-left space-y-2">
        {j.photo_url && (
          <div className="relative -mx-3 -mt-3 h-36 bg-green-100">
            <img src={j.photo_url} alt="" className="w-full h-full object-cover" />
            <span className={`absolute top-2 left-2 shadow-sm ${chip}`}>{LABEL(j.status)}</span>
          </div>
        )}
        <div className="flex gap-3 items-center">
          {!j.photo_url && (
            <div className="w-14 h-14 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <Recycle size={24} />
            </div>
          )}
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold">
              {j.waste_type}
              {isUrgent(j) && <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">URGENT</span>}
              {isOverdue(j) && <span className="ml-1 text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Overdue</span>}
            </p>
            <p className="text-gray-500">{j.address}</p>
            {j.preferred_date && <p className="text-xs text-green-700">Preferred: {fmtPref(j)}</p>}
            {j.quantity && <p className="text-gray-600 text-xs mt-0.5">Quantity: {j.quantity}</p>}
            {j.description && <p className="text-gray-600 text-xs mt-0.5">{j.description}</p>}
            <div className="flex items-center gap-2 mt-1">
              {!j.photo_url && <span className={chip}>{LABEL(j.status)}</span>}
              {away !== null && j.status !== 'collected' && (
                <span className="text-xs text-green-700 font-semibold flex items-center gap-0.5">
                  <MapPin size={12} />{fmtKm(away)} away
                </span>
              )}
            </div>
          </div>
          {j.proof_url && <img src={j.proof_url} alt="Collected" className="w-14 h-14 object-cover rounded-lg border-2 border-green-700" />}
          <ChevronRight size={18} className="text-gray-400 shrink-0" />
        </div>
      </button>

      <JobActions j={j} onChanged={onChanged} />
      {j.status === 'collected' && <Timeline r={j} />}
    </div>
  )
}

export default function Collector() {
  const [jobs, setJobs] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [page, setPage] = useState('jobs')
  const [view, setView] = useState('active')
  const [pos, setPos] = useState(null)
  const [sel, setSel] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) setLoadErr(error.message); else { setLoadErr(''); setJobs(data || []) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('collector-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const selected = sel ? jobs.find((j) => j.id === sel) : null
  if (selected) {
    return (
      <TaskDetail j={selected} pos={pos} onChanged={load}
        onBack={() => { setSel(null); window.scrollTo(0, 0) }} />
    )
  }

  const open = jobs.filter((j) => j.status !== 'collected')
  const done = jobs.filter((j) => j.status === 'collected')
  const dist = (j) => (pos ? distKm(pos.lat, pos.lng, j.lat, j.lng) : 0)
  const list = view === 'done' ? done : [...open].sort((a, b) => (pos ? dist(a) - dist(b) : 0))
  const openJob = (id) => { setSel(id); window.scrollTo(0, 0) }

  const rated = done.filter((j) => j.rating)
  const hrs = done.filter((j) => j.started_at && j.collected_at)
    .map((j) => (new Date(j.collected_at) - new Date(j.started_at)) / 36e5)
  const weekAgo = Date.now() - 7 * 864e5
  const center = open[0] ? [open[0].lat, open[0].lng] : pos ? [pos.lat, pos.lng] : [9.08, 8.67]

  return (
    <div className="max-w-md lg:max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My jobs</h1>

      <LocationBanner />

      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
        {[['jobs', 'Jobs'], ['map', 'Map'], ['stats', 'Stats']].map(([k, label]) => (
          <button key={k} onClick={() => setPage(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${page === k ? 'bg-green-700 text-white' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}
      {!loaded && <Skeleton rows={3} />}

      {loaded && page === 'jobs' && (
        <div className="space-y-3">
          <SectionTabs view={view} setView={setView} loaded={loaded} active={open.length} done={done.length} />
          {jobs.length === 0 && <Empty title="No jobs yet" text="Jobs the admin assigns to you will appear here." />}
          {list.map((j) => <Job key={j.id} j={j} pos={pos} onChanged={load} onOpen={() => openJob(j.id)} />)}
        </div>
      )}

      {loaded && page === 'map' && (
        <div className="space-y-3">
          <div className="h-[60vh] rounded-xl overflow-hidden border border-gray-200">
            <MapContainer maxZoom={19} key={open.length ? 'has' : 'none'} center={center}
              zoom={open.length ? 13 : 6} className="h-full w-full">
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
              <LocateControl />
              {open.map((j) => (
                <CircleMarker key={j.id} center={[j.lat, j.lng]} radius={10}
                  pathOptions={{ color: HEX[j.status], fillColor: HEX[j.status], fillOpacity: 0.85 }}>
                  <Popup>
                    {j.waste_type} · {LABEL(j.status)}<br />{j.address}<br />
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lng}`}
                      target="_blank" rel="noreferrer">Get directions</a>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          {open.length === 0 && <p className="text-sm text-gray-500">No open jobs to show.</p>}
        </div>
      )}

      {loaded && page === 'stats' && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Open jobs" value={open.length} />
          <Stat label="In progress" value={jobs.filter((j) => j.status === 'in_progress').length} />
          <Stat label="Collected, all time" value={done.length} />
          <Stat label="Collected, last 7 days" value={done.filter((j) => j.collected_at && new Date(j.collected_at) > weekAgo).length} />
          <Stat label="Avg hours on site" value={hrs.length ? (hrs.reduce((a, b) => a + b, 0) / hrs.length).toFixed(1) : '-'} />
          <Stat label={`Avg rating (${rated.length} rated)`} value={rated.length ? (rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1) : '-'} />
        </div>
      )}
    </div>
  )
}
