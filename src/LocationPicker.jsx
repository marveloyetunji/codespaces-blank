import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { TILE_URL, TILE_ATTR, TILE_NATIVE } from './mapStyle'

const pin = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#2E9B47;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 24],
})

const STREET = {
  url: TILE_URL,
  attr: TILE_ATTR,
}
const SAT = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attr: 'Imagery &copy; Esri',
}

function Follow({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 17))
  }, [lat, lng])
  return null
}

function Tap({ onMove }) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function LocationPicker({ lat, lng, acc, onMove }) {
  const [sat, setSat] = useState(false)
  const layer = sat ? SAT : STREET
  const handlers = useMemo(
    () => ({
      dragend(e) {
        const p = e.target.getLatLng()
        onMove(p.lat, p.lng)
      },
    }),
    [onMove]
  )

  return (
    <div className="space-y-2">
      <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={[lat, lng]} zoom={17} maxZoom={19} className="h-full w-full">
          <TileLayer key={sat ? 'sat' : 'street'} url={layer.url} attribution={layer.attr} maxNativeZoom={sat ? 19 : TILE_NATIVE} maxZoom={19} />
          {acc ? (
            <Circle center={[lat, lng]} radius={acc}
              pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.12 }} />
          ) : null}
          <Marker position={[lat, lng]} icon={pin} draggable eventHandlers={handlers} />
          <Follow lat={lat} lng={lng} />
          <Tap onMove={onMove} />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Drag the pin or tap the map to fix the spot.</span>
        <button type="button" onClick={() => setSat(!sat)} className="text-green-700 font-medium">
          {sat ? 'Street map' : 'Satellite'}
        </button>
      </div>
    </div>
  )
}
