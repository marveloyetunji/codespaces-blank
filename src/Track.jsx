import { MapContainer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, ChevronRight } from 'lucide-react'
import MapTiles from './MapTiles'
import { pinIcon } from './mapStyle'

const STEPS = ['Received', 'Approved', 'Assigned', 'On it', 'Done']
const RANK = { pending: 0, approved: 1, assigned: 2, in_progress: 3 }
const INFO = {
  pending: ['Report received', 'The admin is reviewing it.'],
  approved: ['Approved', 'Waiting for a collector to be assigned.'],
  assigned: ['Collector assigned', 'A collector will start soon.'],
  in_progress: ['Being attended to', 'A collector is working on it now.'],
}

export default function Track({ reports, go }) {
  const open = reports.filter((x) => RANK[x.status] !== undefined)
  const r = open[0]
  if (!r) return null
  const rank = RANK[r.status]
  const [title, sub] = r.status === 'assigned' && r.accepted_at
    ? ['Collector accepted', 'They will start soon.']
    : INFO[r.status]

  return (
    <div className="space-y-2">
      <h2 className="font-display font-bold text-gray-900">Live tracking</h2>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden lift">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
                {r.waste_type} · latest open report
              </p>
              <p className="font-display font-bold text-gray-900 text-lg leading-snug mt-0.5">{title}</p>
              <p className="text-sm text-gray-500">{sub}</p>
            </div>
            {open.length > 1 && (
              <span className="shrink-0 text-xs bg-green-100 text-green-800 rounded-full px-2.5 py-1 font-semibold">
                +{open.length - 1} more
              </span>
            )}
          </div>

          <ol className="mt-5 flex items-start">
            {STEPS.map((label, i) => {
              const state = i < rank ? 'done' : i === rank ? 'now' : 'todo'
              return (
                <li key={label} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && (
                    <span className={`absolute top-[11px] right-1/2 w-full h-0.5 ${i <= rank ? 'bg-green-700' : 'bg-gray-200'}`} />
                  )}
                  <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    state === 'done' ? 'bg-green-700 text-white'
                    : state === 'now' ? 'bg-white border-2 border-green-700 text-green-700 ring-4 ring-green-100'
                    : 'bg-gray-100 text-gray-400'}`}>
                    {state === 'done' ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`mt-1.5 text-[10px] ${state === 'todo' ? 'text-gray-400' : 'text-gray-700 font-semibold'}`}>{label}</span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="h-32">
          <MapContainer key={r.id} center={[r.lat, r.lng]} zoom={16} maxZoom={19} className="h-full w-full"
            scrollWheelZoom={false} dragging={false} touchZoom={false} doubleClickZoom={false}
            boxZoom={false} keyboard={false} zoomControl={false}>
            <MapTiles />
            <Marker position={[r.lat, r.lng]} icon={pinIcon('#2E9B47')} interactive={false} />
          </MapContainer>
        </div>

        {go && (
          <button onClick={() => go('history')}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-green-700 border-t border-gray-100">
            View details <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
