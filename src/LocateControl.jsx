import { useEffect, useState } from 'react'
import { useMap, CircleMarker, Circle } from 'react-leaflet'

export default function LocateControl() {
  const map = useMap()
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  return (
    <>
      {pos && (
        <Circle center={[pos.lat, pos.lng]} radius={Math.min(pos.acc, 200)}
          pathOptions={{ stroke: false, fillColor: '#2563eb', fillOpacity: 0.12 }} />
      )}
      {pos && (
        <CircleMarker center={[pos.lat, pos.lng]} radius={8}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />
      )}
      <button type="button"
        onClick={() => pos && map.flyTo([pos.lat, pos.lng], 16)}
        style={{ position: 'absolute', right: 10, bottom: 10, zIndex: 1000 }}
        className="bg-white rounded-full w-11 h-11 shadow-lg text-xl">
        🎯
      </button>
    </>
  )
}
