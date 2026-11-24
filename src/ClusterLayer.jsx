import { useState } from 'react'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { pinIcon } from './mapStyle'

const CELL = 64
const icons = {}
const clusterIcon = (n) =>
  icons[n] ||
  (icons[n] = L.divIcon({
    className: '',
    html: `<div class="cluster">${n}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  }))

// Groups nearby pins into numbered clusters; tap a cluster to zoom into it.
export default function ClusterLayer({ items, selectedId, onSelect }) {
  const map = useMap()
  const [, setTick] = useState(0)
  useMapEvents({ zoomend: () => setTick((t) => t + 1) })

  const z = map.getZoom()
  const groups = {}
  items.forEach((it) => {
    const p = map.project([it.lat, it.lng], z)
    const k = Math.floor(p.x / CELL) + ':' + Math.floor(p.y / CELL)
    ;(groups[k] = groups[k] || []).push(it)
  })

  return (
    <>
      {Object.values(groups).flatMap((g) => {
        if (g.length === 1 || z >= 18) {
          return g.map((it) => (
            <Marker key={it.id} position={[it.lat, it.lng]} icon={pinIcon(it.color)}
              zIndexOffset={selectedId === it.id ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(it.id) }} />
          ))
        }
        const lat = g.reduce((a, x) => a + x.lat, 0) / g.length
        const lng = g.reduce((a, x) => a + x.lng, 0) / g.length
        return [
          <Marker key={'c' + g.map((x) => x.id).join('')} position={[lat, lng]} icon={clusterIcon(g.length)}
            eventHandlers={{ click: () => map.fitBounds(g.map((x) => [x.lat, x.lng]), { padding: [70, 70], maxZoom: 18 }) }} />,
        ]
      })}
    </>
  )
}
