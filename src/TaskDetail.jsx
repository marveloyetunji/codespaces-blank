import { MapContainer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, MapPin } from 'lucide-react'
import MapTiles from './MapTiles'
import Timeline from './Timeline'
import BeforeAfter from './BeforeAfter'
import JobActions from './JobActions'
import { StatusBadge } from './ui'
import { pinIcon, youIcon } from './mapStyle'
import { distKm, fmtKm } from './geo'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'
import { ago } from './time'

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 text-sm py-2.5 border-b border-line last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  )
}

export default function TaskDetail({ j, pos, onBack, onChanged }) {
  const away = pos && j.status !== 'collected' ? fmtKm(distKm(pos.lat, pos.lng, j.lat, j.lng)) : null
  const urgent = isUrgent(j)
  const pts = pos ? [[pos.lat, pos.lng], [j.lat, j.lng]] : null
  const mapProps = pts
    ? { bounds: pts, boundsOptions: { padding: [40, 40] } }
    : { center: [j.lat, j.lng], zoom: 16 }

  return (
    <div className="max-w-md lg:max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onBack} aria-label="Back" className="w-11 h-11 -ml-2 flex items-center justify-center text-ink">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-extrabold text-ink flex-1">Job details</h1>
        <StatusBadge status={j.status} />
      </div>

      {j.status === 'collected' && j.proof_url
        ? <BeforeAfter r={j} />
        : j.photo_url && <img src={j.photo_url} alt="Waste" className="w-full h-48 object-cover rounded-2xl" />}

      <div className="bg-white border border-line rounded-2xl grid grid-cols-3 divide-x divide-line text-center">
        {[['Waste', j.waste_type], ['Quantity', j.quantity || 'Not given'], ['Priority', urgent ? 'Urgent' : 'Normal']].map(([l, v]) => (
          <div key={l} className="py-3 px-2">
            <p className={`font-display font-bold truncate ${l === 'Priority' && urgent ? 'text-orange-800' : 'text-ink'}`}>{v}</p>
            <p className="text-[11px] text-muted">{l}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-line rounded-2xl p-4 flex gap-3">
        <div className="flex flex-col items-center pt-1">
          <span className="w-3 h-3 rounded-full border-2 border-green-700 bg-white" />
          <span className="w-0.5 flex-1 bg-green-200 my-1" />
          <MapPin size={16} className="text-green-700" />
        </div>
        <div className="flex-1 min-w-0 space-y-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Your location</p>
            <p className="text-ink">{pos ? 'Found by GPS' : 'Location is off'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Destination</p>
            <p className="text-ink">{j.address}</p>
            <p className="text-xs text-muted">{`${j.lat.toFixed(5)}, ${j.lng.toFixed(5)}`}{away && ` · ${away} away`}</p>
          </div>
        </div>
      </div>

      <div className="h-48 rounded-2xl overflow-hidden border border-line">
        <MapContainer key={pts ? 'route' : 'spot'} {...mapProps} maxZoom={19} className="h-full w-full"
          dragging={false} touchZoom={false} doubleClickZoom={false} scrollWheelZoom={false}
          zoomControl={false} boxZoom={false} keyboard={false}>
          <MapTiles />
          {pts && <Polyline positions={pts} pathOptions={{ color: '#118542', weight: 4, dashArray: '2 9', lineCap: 'round' }} />}
          {pos && <Marker position={[pos.lat, pos.lng]} icon={youIcon} interactive={false} />}
          <Marker position={[j.lat, j.lng]} icon={pinIcon(urgent ? '#ea580c' : '#118542')} interactive={false} />
        </MapContainer>
      </div>

      <div className="bg-white border border-line rounded-2xl px-4">
        <Row label="Notes" value={j.description} />
        <Row label="Preferred" value={fmtPref(j)} />
        <Row label="Reported" value={ago(j.created_at)} />
        {isOverdue(j) && <Row label="Time" value="Overdue" />}
      </div>

      <div className="bg-white border border-line rounded-2xl p-4"><Timeline r={j} /></div>

      <JobActions j={j} onChanged={onChanged} />
    </div>
  )
}
