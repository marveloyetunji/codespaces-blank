import { useState } from 'react'
import { MapContainer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, Recycle } from 'lucide-react'
import FullMap from './FullMap'
import MapTiles from './MapTiles'
import LocateControl from './LocateControl'
import LocationBanner from './LocationBanner'
import ClusterLayer from './ClusterLayer'
import { MapTabs, Chip, SlideCard, Fit, Focus, Away } from './MapUI'
import { StatusBadge } from './ui'
import { distKm, fmtKm } from './geo'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'

const HEX = { assigned: '#2563eb', in_progress: '#ea580c', collected: '#118542' }
const TABS = [['jobs', 'Jobs'], ['map', 'Map'], ['stats', 'Stats']]

export default function CollectorMap({ jobs, pos, page, setPage, onOpen }) {
  const [show, setShow] = useState('open')
  const [selId, setSelId] = useState(null)

  const open = jobs.filter((j) => j.status !== 'collected')
  const done = jobs.filter((j) => j.status === 'collected')
  const list = show === 'done' ? done : open
  const sel = selId ? list.find((j) => j.id === selId) || null : null
  const pts = list.map((j) => [j.lat, j.lng])
  const center = pts[0] || (pos ? [pos.lat, pos.lng] : [9.08, 8.67])
  const items = list.map((j) => ({ id: j.id, lat: j.lat, lng: j.lng, color: HEX[j.status] }))
  const away = sel && pos && sel.status !== 'collected'
    ? fmtKm(distKm(pos.lat, pos.lng, sel.lat, sel.lng)) + ' away'
    : null

  return (
    <FullMap>
      <MapContainer center={center} zoom={list.length ? 13 : 15} maxZoom={19} className="h-full w-full">
        <MapTiles />
        <Fit pts={pts} />
        <Focus job={sel} />
        <Away onClear={() => setSelId(null)} />
        <LocateControl follow={list.length === 0} bottom={sel ? 250 : 30} />
        <ClusterLayer items={items} selectedId={selId} onSelect={setSelId} />
      </MapContainer>

      <div className="absolute top-3 inset-x-3 mx-auto max-w-md space-y-2 pointer-events-none" style={{ zIndex: 1000 }}>
        <MapTabs tabs={TABS} page={page} onChange={setPage} />
        <div className="flex gap-2">
          <Chip active={show === 'open'} onClick={() => { setShow('open'); setSelId(null) }}>Open ({open.length})</Chip>
          <Chip active={show === 'done'} onClick={() => { setShow('done'); setSelId(null) }}>Completed ({done.length})</Chip>
        </div>
        <div className="pointer-events-auto"><LocationBanner /></div>
      </div>

      {!sel && list.length === 0 && (
        <div className="absolute left-3 bg-white rounded-full px-4 py-2 text-sm text-ink map-float pointer-events-none"
          style={{ bottom: 36, zIndex: 1000 }}>
          {show === 'open' ? 'No open jobs right now' : 'No completed jobs yet'}
        </div>
      )}

      {sel && (
        <SlideCard onClose={() => setSelId(null)}>
          <div className="flex gap-3">
            {sel.photo_url
              ? <img src={sel.photo_url} alt="" className="w-16 h-16 object-cover rounded-xl shrink-0" />
              : <div className="w-16 h-16 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Recycle size={24} /></div>}
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-display font-bold text-ink">
                {sel.waste_type}
                {isUrgent(sel) && <span className="ml-2 text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">Urgent</span>}
                {isOverdue(sel) && <span className="ml-1 text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>}
              </p>
              <p className="text-muted">{sel.address}</p>
              {sel.preferred_date && <p className="text-xs text-green-800">Preferred {fmtPref(sel)}</p>}
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={sel.status} />
                {away && <span className="text-xs text-green-800 font-semibold">{away}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {sel.status !== 'collected' && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`}
                target="_blank" rel="noreferrer" className="btn btn-outline flex-1">
                <Navigation size={16} /> Navigate
              </a>
            )}
            <button type="button" onClick={() => onOpen(sel.id)} className="btn btn-primary flex-1">Open job</button>
          </div>
        </SlideCard>
      )}
    </FullMap>
  )
}
