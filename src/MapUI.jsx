import { useEffect, useRef, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

export function MapTabs({ tabs, page, onChange }) {
  return (
    <div role="tablist" className="pointer-events-auto flex bg-white rounded-full p-1 gap-1 map-float">
      {tabs.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={page === k} onClick={() => onChange(k)}
          className={`flex-1 min-h-[40px] rounded-full text-sm font-semibold ${page === k ? 'bg-green-700 text-white' : 'text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active}
      className={`pointer-events-auto shrink-0 whitespace-nowrap rounded-full px-3.5 min-h-[40px] text-sm font-semibold map-float flex items-center gap-1.5 ${active ? 'bg-green-700 text-white' : 'bg-white text-ink'}`}>
      {children}
    </button>
  )
}

// Bottom sheet that closes when you swipe down on its handle.
export function SlideCard({ onClose, children }) {
  const [dy, setDy] = useState(0)
  const start = useRef(null)
  const down = (e) => { start.current = e.touches[0].clientY }
  const move = (e) => { if (start.current != null) setDy(Math.max(0, e.touches[0].clientY - start.current)) }
  const up = () => { if (dy > 70) onClose(); setDy(0); start.current = null }

  return (
    <div role="dialog" aria-label="Report details"
      className="slide-card absolute bottom-0 inset-x-0 mx-auto max-w-md bg-white rounded-t-2xl px-4 pb-4"
      style={{ zIndex: 1000, transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? 'none' : 'transform .2s ease' }}>
      <div onTouchStart={down} onTouchMove={move} onTouchEnd={up} className="pt-2 pb-1">
        <button type="button" onClick={onClose} aria-label="Close" className="block w-full py-2">
          <span className="block mx-auto w-10 h-1 rounded-full bg-gray-300" />
        </button>
      </div>
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
