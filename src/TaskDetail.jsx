import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft } from 'lucide-react'
import Timeline from './Timeline'
import BeforeAfter from './BeforeAfter'
import JobActions from './JobActions'
import { distKm, fmtKm } from './geo'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'

const STYLE = {
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 text-sm py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}

export default function TaskDetail({ j, pos, onBack, onChanged }) {
  const away = pos && j.status !== 'collected'
    ? fmtKm(distKm(pos.lat, pos.lng, j.lat, j.lng)) + ' away'
    : null

  return (
    <div className="max-w-md lg:max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Back" className="p-1 -ml-1"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold text-gray-900">Job details</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${STYLE[j.status]}`}>{j.status.replace('_', ' ')}</span>
        {isUrgent(j) && <span className="text-[10px] font-semibold bg-red-600 text-white px-2 py-1 rounded">URGENT</span>}
        {isOverdue(j) && <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-1 rounded">Overdue</span>}
      </div>

      {j.status === 'collected' && j.proof_url
        ? <BeforeAfter r={j} />
        : j.photo_url && <img src={j.photo_url} alt="Waste" className="w-full h-56 object-cover rounded-xl" />}

      <div className="bg-white border border-gray-200 rounded-xl px-3">
        <Row label="Waste type" value={j.waste_type} />
        <Row label="Quantity" value={j.quantity} />
        <Row label="Address" value={j.address} />
        <Row label="Coordinates" value={`${j.lat.toFixed(5)}, ${j.lng.toFixed(5)}`} />
        <Row label="Description" value={j.description} />
        <Row label="Preferred date" value={fmtPref(j)} />
        <Row label="Reported" value={new Date(j.created_at).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} />
        <Row label="Distance" value={away} />
      </div>

      <div className="h-48 rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={[j.lat, j.lng]} zoom={16} maxZoom={19} className="h-full w-full"
          dragging={false} touchZoom={false} doubleClickZoom={false} scrollWheelZoom={false}
          zoomControl={false} boxZoom={false} keyboard={false}>
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          <CircleMarker center={[j.lat, j.lng]} radius={10}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#2E9B47', fillOpacity: 1 }} />
          {pos && (
            <CircleMarker center={[pos.lat, pos.lng]} radius={7}
              pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />
          )}
        </MapContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <Timeline r={j} />
      </div>

      <JobActions j={j} onChanged={onChanged} />
    </div>
  )
}
