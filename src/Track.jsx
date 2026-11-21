import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet'
import MapTiles from './MapTiles'
import { pinIcon } from './mapStyle'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'

const STEP = {
  pending: [1, 'Report received'],
  approved: [2, 'Approved. Waiting for a collector'],
  assigned: [3, 'Collector assigned'],
  in_progress: [4, 'Being attended to'],
}

export default function Track({ reports }) {
  const r = reports.find((x) => STEP[x.status])
  if (!r) return null
  const [n, text] = STEP[r.status]

  return (
    <div className="space-y-2">
      <h2 className="font-semibold text-green-700">Live tracking</h2>
      <div className="rounded-xl overflow-hidden border border-green-700">
        <div className="bg-green-700 text-white p-4 space-y-3">
          <div className="flex justify-between items-start gap-3">
            <p className="text-lg font-bold leading-snug">{text}</p>
            <span className="text-xs bg-white/20 rounded px-2 py-1 shrink-0">Step {n} of 4</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= n ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs opacity-90">
            <MapPin size={14} /> <span className="truncate">{r.waste_type} · {r.address}</span>
          </div>
        </div>
        <div className="h-36">
          <MapContainer center={[r.lat, r.lng]} zoom={16} maxZoom={19} className="h-full w-full"
            scrollWheelZoom={false} zoomControl={false}>
            <MapTiles />
            <Marker position={[r.lat, r.lng]} icon={pinIcon('#2E9B47')} />
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
