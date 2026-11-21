import { useEffect, useRef, useState } from 'react'
import { useMap, Marker, Circle } from 'react-leaflet'
import L from 'leaflet'
import { LocateFixed } from 'lucide-react'
import { youIcon } from './mapStyle'

export default function LocateControl({ follow = false, bottom = 30 }) {
  const map = useMap()
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const centred = useRef(false)

  useEffect(() => {
    if (btn.current) L.DomEvent.disableClickPropagation(btn.current)
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  useEffect(() => {
    if (follow && pos && !centred.current) {
      centred.current = true
      map.setView([pos.lat, pos.lng], 16)
    }
  }, [follow, pos, map])

  return (
    <>
      {pos && (
        <Circle center={[pos.lat, pos.lng]} radius={Math.min(pos.acc, 200)}
          pathOptions={{ stroke: false, fillColor: '#1a73e8', fillOpacity: 0.12 }} interactive={false} />
      )}
      {pos && (
        <Marker position={[pos.lat, pos.lng]} icon={youIcon} interactive={false} keyboard={false} zIndexOffset={1000} />
      )}
      <button ref={btn} type="button" aria-label="My location"
        onClick={() => pos && map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 16))}
        style={{ position: 'absolute', right: 12, bottom, zIndex: 1000, transition: 'bottom .22s ease' }}
        className="map-btn">
        <LocateFixed size={22} color={pos ? '#1a73e8' : '#6b7280'} />
      </button>
    </>
  )
}
