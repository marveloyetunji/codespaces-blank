import { useEffect } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

export function MapTabs({ tabs, page, onChange }) {
  return (
    <div className="pointer-events-auto flex bg-white rounded-full p-1 gap-1 map-float">
      {tabs.map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={`flex-1 rounded-full py-2 text-sm font-semibold ${page === k ? 'bg-green-700 text-white' : 'text-gray-600'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`pointer-events-auto shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium map-float flex items-center gap-1.5 ${active ? 'bg-green-700 text-white' : 'bg-white text-gray-700'}`}>
      {children}
    </button>
  )
}

export function SlideCard({ onClose, children }) {
  return (
    <div className="slide-card absolute bottom-0 inset-x-0 mx-auto max-w-md bg-white rounded-t-2xl px-4 pb-4 pt-1"
      style={{ zIndex: 1000 }}>
      <button type="button" onClick={onClose} aria-label="Close" className="block w-full py-2">
        <span className="block mx-auto w-10 h-1 rounded-full bg-gray-300" />
      </button>
      {children}
    </div>
  )
}

export function Fit({ pts }) {
  const map = useMap()
  const key = pts.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (pts.length === 1) map.setView(pts[0], 16)
    else if (pts.length > 1) {
      map.fitBounds(pts, { paddingTopLeft: [30, 140], paddingBottomRight: [30, 60], maxZoom: 17 })
    }
  }, [key])
  return null
}

export function Focus({ job }) {
  const map = useMap()
  useEffect(() => {
    if (!job) return
    const z = Math.max(map.getZoom(), 16)
    const c = map.unproject(map.project([job.lat, job.lng], z).add([0, 120]), z)
    map.flyTo(c, z, { duration: 0.5 })
  }, [job && job.id])
  return null
}

export function Away({ onClear }) {
  useMapEvents({ click: onClear })
  return null
}
