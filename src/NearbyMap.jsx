import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Marker } from 'react-leaflet'
import MapTiles from './MapTiles'
import { pinIcon } from './mapStyle'
import 'leaflet/dist/leaflet.css'
import { RefreshCw } from 'lucide-react'
import { supabase } from './supabaseClient'
import { getPos } from './geo'

const HEX = { pending: '#d97706', approved: '#0d9488', assigned: '#2563eb', in_progress: '#ea580c', collected: '#2E9B47' }
const LABEL = { pending: 'Received', approved: 'Approved', assigned: 'Collector assigned', in_progress: 'Being attended to', collected: 'Completed' }
const ZOOM = { 1: 15, 2: 14, 5: 13 }

export default function NearbyMap() {
  const [pos, setPos] = useState(null)
  const [km, setKm] = useState(2)
  const [rows, setRows] = useState([])
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const locate = useCallback(async () => {
    setLocating(true); setErr('')
    try { setPos(await getPos()) }
    catch (e) { setErr(e.message || 'Allow location to see reports near you, then tap refresh.') }
    setLocating(false)
  }, [])

  useEffect(() => { locate() }, [locate])

  useEffect(() => {
    if (!pos) return
    let live = true
    setLoading(true)
    supabase.rpc('nearby_reports', { p_lat: pos.lat, p_lng: pos.lng, p_km: km }).then(({ data, error }) => {
      if (!live) return
      if (error) setErr(error.message); else { setErr(''); setRows(data || []) }
      setLoading(false)
    })
    return () => { live = false }
  }, [pos, km])

  const open = rows.filter((r) => r.status !== 'collected').length

  return (
    <div className="max-w-md lg:max-w-2xl mx-auto space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nearby reports</h1>
          <p className="text-sm text-gray-500">Waste reported around you. Positions are approximate and no personal details are shown.</p>
        </div>
        <button onClick={locate} disabled={locating} aria-label="Refresh location"
          className="p-2 text-green-700 disabled:opacity-50">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex gap-2">
        {[1, 2, 5].map((k) => (
          <button key={k} onClick={() => setKm(k)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${km === k ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-300'}`}>
            {k} km
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {locating && !pos && <p className="text-sm text-gray-500">Finding your location...</p>}

      {pos && (
        <>
          <div className="h-[55vh] rounded-xl overflow-hidden border border-gray-200">
            <MapContainer key={`${pos.lat},${pos.lng},${km}`} center={[pos.lat, pos.lng]}
              zoom={ZOOM[km]} maxZoom={19} className="h-full w-full">
              <MapTiles />
              <Circle center={[pos.lat, pos.lng]} radius={km * 1000}
                pathOptions={{ color: '#2E9B47', weight: 1, fillColor: '#2E9B47', fillOpacity: 0.05 }} />
              <CircleMarker center={[pos.lat, pos.lng]} radius={8}
                pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />
              {rows.map((r, i) => (
                <Marker key={i} position={[r.lat, r.lng]} icon={pinIcon(HEX[r.status])}>
                  <Popup>
                    {r.waste_type} · {LABEL[r.status]}<br />
                    Reported {new Date(r.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `${open} open and ${rows.length - open} collected within ${km} km`}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
            {Object.keys(HEX).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: HEX[s] }} />{LABEL[s]}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
