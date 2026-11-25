import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker } from 'react-leaflet'
import MapTiles from './MapTiles'
import { pinIcon } from './mapStyle'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const HEX = { pending: '#d97706', approved: '#0d9488', assigned: '#2563eb', in_progress: '#ea580c', collected: '#118542' }
const LABEL = { pending: 'Received', approved: 'Approved', assigned: 'Collector assigned', in_progress: 'Being attended to', collected: 'Completed' }

function Fit({ pts }) {
  const map = useMap()
  const key = pts.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 17 })
  }, [key])
  return null
}

export default function HomeMap({ reports }) {
  const list = reports.filter((r) => HEX[r.status])
  if (!list.length) return null
  const pts = list.map((r) => [r.lat, r.lng])
  const open = list.filter((r) => r.status !== 'collected').length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-green-700">Your reports on the map</h2>
        <p className="text-xs text-gray-500">{open} open · {list.length - open} collected</p>
      </div>
      <div className="h-44 rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={pts[0]} zoom={15} maxZoom={19} className="h-full w-full"
          dragging={false} touchZoom={false} doubleClickZoom={false} scrollWheelZoom={false}
          zoomControl={false} boxZoom={false} keyboard={false}>
          <MapTiles />
          <Fit pts={pts} />
          {list.map((r) => (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={pinIcon(HEX[r.status])}>
              <Popup>{r.waste_type} · {LABEL[r.status]}<br />{r.address}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
        {Object.keys(HEX).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: HEX[s] }} />{LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  )
}
