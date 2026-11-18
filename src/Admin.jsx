import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, Download, Flame, ChevronDown, ChevronUp, Recycle } from 'lucide-react'
import { supabase } from './supabaseClient'
import Analytics from './Analytics'
import Timeline from './Timeline'
import BeforeAfter from './BeforeAfter'
import SectionTabs from './SectionTabs'
import LocateControl from './LocateControl'
import { Skeleton, Empty } from './Skeleton'
import { exportCsv } from './exportCsv'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'

const STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-teal-50 text-teal-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}
const HEX = { pending: '#d97706', approved: '#0d9488', assigned: '#2563eb', in_progress: '#ea580c', collected: '#2E9B47', rejected: '#9ca3af', cancelled: '#9ca3af' }
const LABEL = (s) => (s === 'pending' ? 'Submitted' : s.replace('_', ' '))
const isClosed = (r) => ['collected', 'rejected', 'cancelled'].includes(r.status)

function Stat({ label, value, tone }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <p className={`text-2xl font-bold ${tone || 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function ReportRow({ r, collectors, reload }) {
  const [open, setOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const update = async (patch) => {
    setBusy(true); setErr('')
    const { error } = await supabase.from('reports').update(patch).eq('id', r.id)
    setBusy(false)
    if (error) setErr(error.message)
    else { setRejecting(false); setReason(''); reload() }
  }

  const assign = (id) =>
    update(id ? { assigned_to: id, status: 'assigned' } : { assigned_to: null, status: 'approved' })

  const confirmReject = () => {
    if (!reason.trim()) return setErr('Write a reason for the resident.')
    update({ status: 'rejected', rejection_reason: reason.trim() })
  }

  const collector = collectors.find((c) => c.id === r.assigned_to)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2"
      style={isOverdue(r) ? { borderLeft: '4px solid #dc2626' } : undefined}>
      <div className="flex gap-3">
        {r.photo_url
          ? <img src={r.photo_url} alt="" className="w-14 h-14 object-cover rounded-lg" />
          : <div className="w-14 h-14 rounded-lg bg-green-100 text-green-700 flex items-center justify-center"><Recycle size={22} /></div>}
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-semibold">
            {r.waste_type}
            {isUrgent(r) && <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">URGENT</span>}
            {isOverdue(r) && <span className="ml-1 text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">Overdue</span>}
          </p>
          <p className="text-gray-500 truncate">{r.address}</p>
          {r.preferred_date && <p className="text-xs text-green-700">Preferred: {fmtPref(r)}</p>}
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs capitalize ${STYLE[r.status]}`}>{LABEL(r.status)}</span>
          {collector && <span className="ml-2 text-xs text-gray-500">{collector.name || 'Collector'}</span>}
        </div>
        <button onClick={() => setOpen(!open)} aria-label="Details" className="text-gray-400 self-start p-1">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {open && (
        <div className="space-y-2 text-sm">
          {r.quantity && <p className="text-gray-700">Quantity: {r.quantity}</p>}
          {r.description && <p className="text-gray-700">{r.description}</p>}
          <BeforeAfter r={r} />
          {r.status === 'rejected'
            ? <p className="text-xs text-red-700">Rejected: {r.rejection_reason}</p>
            : r.status === 'cancelled'
            ? <p className="text-xs text-gray-700">Cancelled by resident: {r.cancel_reason}</p>
            : <Timeline r={r} />}
          {r.rating && <p className="text-xs text-gray-600">Resident rating: <b>{r.rating} of 5</b></p>}
        </div>
      )}

      {r.status === 'pending' && !rejecting && (
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => update({ status: 'approved' })}
            className="flex-1 bg-green-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">Approve</button>
          <button disabled={busy} onClick={() => setRejecting(true)}
            className="flex-1 border border-red-300 text-red-600 rounded-lg py-2 text-sm font-semibold">Reject</button>
        </div>
      )}

      {rejecting && (
        <div className="space-y-2">
          <textarea className="field" rows={2} placeholder="Reason for the resident"
            value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={confirmReject}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">Confirm reject</button>
            <button onClick={() => { setRejecting(false); setErr('') }}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Back</button>
          </div>
        </div>
      )}

      {(r.status === 'approved' || r.status === 'assigned') && (
        <select className="field" disabled={busy} value={r.assigned_to || ''}
          onChange={(e) => assign(e.target.value)}>
          <option value="">Assign to a collector</option>
          {collectors.map((c) => <option key={c.id} value={c.id}>{c.name || 'Collector'}</option>)}
        </select>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}

export default function Admin() {
  const [reports, setReports] = useState([])
  const [collectors, setCollectors] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [page, setPage] = useState('overview')
  const [view, setView] = useState('active')
  const [heat, setHeat] = useState(false)
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType] = useState('')
  const [fCol, setFCol] = useState('')

  const load = useCallback(async () => {
    const r = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    const c = await supabase.from('profiles').select('id,name').eq('role', 'collector')
    if (r.error) setLoadErr(r.error.message)
    else { setLoadErr(''); setReports(r.data || []) }
    setCollectors(c.data || [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('admin-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const nameOf = (id) => collectors.find((c) => c.id === id)?.name || 'Collector'
  const n = (fn) => reports.filter(fn).length
  const types = [...new Set(reports.map((r) => r.waste_type))]

  const shown = reports.filter((r) =>
    (view === 'done' ? isClosed(r) : !isClosed(r)) &&
    (!fStatus || r.status === fStatus) &&
    (!fType || r.waste_type === fType) &&
    (!fCol || (fCol === 'none' ? !r.assigned_to : r.assigned_to === fCol)) &&
    (!q || ((r.address || '') + ' ' + (r.description || '') + ' ' + r.waste_type).toLowerCase().includes(q.toLowerCase()))
  )

  const perf = collectors.map((c) => {
    const mine = reports.filter((r) => r.assigned_to === c.id)
    const done = mine.filter((r) => r.status === 'collected')
    const rated = done.filter((r) => r.rating)
    const hrs = done.filter((r) => r.collected_at).map((r) => (new Date(r.collected_at) - new Date(r.created_at)) / 36e5)
    return {
      id: c.id, name: c.name || 'Collector',
      open: mine.length - done.length, done: done.length,
      rating: rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(1) : '-',
      avg: hrs.length ? (hrs.reduce((a, b) => a + b, 0) / hrs.length).toFixed(1) : '-',
    }
  })

  const cells = {}
  reports.filter((r) => !isClosed(r)).forEach((r) => {
    const k = Math.round(r.lat / 0.003) + ':' + Math.round(r.lng / 0.003)
    const c = cells[k] || (cells[k] = { n: 0, lat: 0, lng: 0, address: r.address })
    c.n++; c.lat += r.lat; c.lng += r.lng
  })
  const hotspots = Object.values(cells).map((c) => ({ ...c, lat: c.lat / c.n, lng: c.lng / c.n })).sort((a, b) => b.n - a.n)

  const onMap = reports.filter((r) => !['rejected', 'cancelled'].includes(r.status))
  const center = onMap[0] ? [onMap[0].lat, onMap[0].lng] : [9.08, 8.67]

  return (
    <div className="max-w-md lg:max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
        {[['overview', 'Overview'], ['reports', 'Reports'], ['map', 'Map']].map(([k, label]) => (
          <button key={k} onClick={() => setPage(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${page === k ? 'bg-green-700 text-white' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}
      {!loaded && <Skeleton rows={3} />}

      {loaded && page === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            <p className="px-3 pt-3 pb-2 font-semibold text-green-700">Needs your attention</p>
            {[
              ['Awaiting review', n((r) => r.status === 'pending'), 'pending'],
              ['Approved, waiting for a collector', n((r) => r.status === 'approved'), 'approved'],
              ['Overdue', n(isOverdue), ''],
            ].map(([label, count, status]) => (
              <button key={label} onClick={() => { setFStatus(status); setView('active'); setPage('reports') }}
                className="w-full flex items-center justify-between px-3 py-3 text-left">
                <span className="text-sm text-gray-800">{label}</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${count ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            {n((r) => ['assigned', 'in_progress'].includes(r.status))} with collectors · {n((r) => r.status === 'collected')} collected · {n((r) => r.status === 'rejected')} rejected
          </p>

          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="font-semibold text-green-700 mb-2">Collector performance</p>
            {perf.length === 0 && <p className="text-sm text-gray-500">No collectors yet. Set a role in Users.</p>}
            {perf.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="font-medium pb-1">Name</th><th className="font-medium pb-1">Open</th>
                    <th className="font-medium pb-1">Done</th><th className="font-medium pb-1">Rating</th>
                    <th className="font-medium pb-1">Avg h</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="py-1.5 pr-2 truncate max-w-[90px]">{p.name}</td>
                      <td>{p.open}</td><td>{p.done}</td><td>{p.rating}</td><td>{p.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Analytics reports={reports} />
        </div>
      )}

      {loaded && page === 'reports' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="field !pl-10" placeholder="Search address or description"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select className="field !p-2 text-xs" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">All status</option>
              {Object.keys(STYLE).map((s) => <option key={s} value={s}>{LABEL(s)}</option>)}
            </select>
            <select className="field !p-2 text-xs" value={fType} onChange={(e) => setFType(e.target.value)}>
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="field !p-2 text-xs" value={fCol} onChange={(e) => setFCol(e.target.value)}>
              <option value="">All collectors</option>
              <option value="none">Unassigned</option>
              {collectors.map((c) => <option key={c.id} value={c.id}>{c.name || 'Collector'}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing {shown.length} of {reports.length}</p>
            <button onClick={() => exportCsv(reports, nameOf)}
              className="text-sm text-green-700 font-medium flex items-center gap-1">
              <Download size={16} /> Export CSV
            </button>
          </div>

          <SectionTabs view={view} setView={setView} loaded={loaded}
            active={reports.filter((r) => !isClosed(r)).length}
            done={reports.filter(isClosed).length} />

          {reports.length === 0 && <Empty title="No reports yet" text="New resident reports will appear here." />}
          <div className="grid gap-3 lg:grid-cols-2">
            {shown.map((r) => <ReportRow key={r.id} r={r} collectors={collectors} reload={load} />)}
          </div>
        </div>
      )}

      {loaded && page === 'map' && (
        <div className="space-y-3">
          <button onClick={() => setHeat(!heat)}
            className="w-full bg-white border border-green-700 text-green-700 rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2">
            <Flame size={16} /> {heat ? 'Show report pins' : 'Show hotspot heatmap'}
          </button>

          {heat && (
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm space-y-1">
              <p className="font-semibold text-green-700">Top hotspots (open reports)</p>
              {hotspots.length === 0 && <p className="text-xs text-gray-500">No open reports.</p>}
              {hotspots.slice(0, 3).map((h, i) => (
                <p key={i}>{i + 1}. {h.address || 'Unknown area'} <b>({h.n})</b></p>
              ))}
            </div>
          )}

          <div className="h-[60vh] rounded-xl overflow-hidden border border-gray-200">
            <MapContainer maxZoom={19} key={onMap.length ? 'has' : 'none'} center={center}
              zoom={onMap.length ? 13 : 6} className="h-full w-full">
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
              <LocateControl />
              {heat && hotspots.map((h, i) => (
                <Circle key={i} center={[h.lat, h.lng]} radius={150 + Math.min(h.n, 10) * 60}
                  pathOptions={{ stroke: false, fillColor: h.n >= 3 ? '#dc2626' : '#f97316', fillOpacity: 0.3 }} />
              ))}
              {onMap.map((r) => (
                <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={9}
                  pathOptions={{ color: HEX[r.status], fillColor: HEX[r.status], fillOpacity: 0.85 }}>
                  <Popup>{r.waste_type} · {LABEL(r.status)}<br />{r.address}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
            {['pending', 'approved', 'assigned', 'in_progress', 'collected'].map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: HEX[s] }} />{LABEL(s)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
