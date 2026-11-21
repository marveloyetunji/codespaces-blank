import { useState } from 'react'
import { MapContainer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, Recycle } from 'lucide-react'
import FullMap from './FullMap'
import MapTiles from './MapTiles'
import LocateControl from './LocateControl'
import LocationBanner from './LocationBanner'
import { MapTabs, Chip, SlideCard, Fit, Focus, Away } from './MapUI'
import { pinIcon } from './mapStyle'
import { distKm, fmtKm } from './geo'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'

const HEX = { assigned: '#2563eb', in_progress: '#ea580c', collected: '#2E9B47' }
const STYLE = {
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
}
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
        {list.map((j) => (
          <Marker key={j.id} position={[j.lat, j.lng]} icon={pinIcon(HEX[j.status])}
            zIndexOffset={sel && sel.id === j.id ? 1000 : 0}
            eventHandlers={{ click: () => setSelId(j.id) }} />
        ))}
      </MapContainer>

      <div className="absolute top-3 inset-x-3 mx-auto max-w-md space-y-2 pointer-events-none" style={{ zIndex: 1000 }}>
        <MapTabs tabs={TABS} page={page} onChange={setPage} />
        <div className="flex gap-2 pointer-events-none">
          <Chip active={show === 'open'} onClick={() => { setShow('open'); setSelId(null) }}>Open ({open.length})</Chip>
          <Chip active={show === 'done'} onClick={() => { setShow('done'); setSelId(null) }}>Completed ({done.length})</Chip>
        </div>
        <div className="pointer-events-auto"><LocationBanner /></div>
      </div>

      {!sel && list.length === 0 && (
        <div className="absolute left-3 bg-white rounded-full px-4 py-2 text-sm text-gray-700 map-float pointer-events-none"
          style={{ bottom: 36, zIndex: 1000 }}>
          {show === 'open' ? 'No open jobs right now' : 'No completed jobs yet'}
        </div>
      )}

      {sel && (
        <SlideCard onClose={() => setSelId(null)}>
          <div className="flex gap-3">
            {sel.photo_url
              ? <img src={sel.photo_url} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
              : <div className="w-16 h-16 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Recycle size={24} /></div>}
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold">
                {sel.waste_type}
                {isUrgent(sel) && <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">URGENT</span>}
                {isOverdue(sel) && <span className="ml-1 text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Overdue</span>}
              </p>
              <p className="text-gray-500">{sel.address}</p>
              {sel.preferred_date && <p className="text-xs text-green-700">Preferred: {fmtPref(sel)}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STYLE[sel.status]}`}>{sel.status.replace('_', ' ')}</span>
                {away && <span className="text-xs text-green-700 font-semibold">{away}</span>}
              </div>
            </div>
          </div>
          {sel.status === 'assigned' && !sel.accepted_at && (
            <p className="text-xs text-amber-700 mt-2">New job. Open it to accept or decline.</p>
          )}
          <div className="flex gap-2 mt-3">
            {sel.status !== 'collected' && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`}
                target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 border border-green-700 text-green-700 rounded-lg py-3 text-sm font-semibold">
                <Navigation size={16} /> Navigate
              </a>
            )}
            <button onClick={() => onOpen(sel.id)}
              className="flex-1 bg-green-700 text-white rounded-lg py-3 text-sm font-semibold">
              Open job
            </button>
          </div>
        </SlideCard>
      )}
    </FullMap>
  )
}
