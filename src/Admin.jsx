import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Download, SlidersHorizontal, ChevronRight, Recycle, Clock } from 'lucide-react'
import { supabase } from './supabaseClient'
import Analytics from './Analytics'
import AdminMap from './AdminMap'
import ReportSheet from './ReportSheet'
import { Skeleton, Empty } from './Skeleton'
import { StatusBadge, SegTabs } from './ui'
import { exportCsv } from './exportCsv'
import { isUrgent, isOverdue } from './priority'
import { ago } from './time'

const TABS = [['overview', 'Overview'], ['reports', 'Reports'], ['map', 'Map']]
const isClosed = (r) => ['collected', 'rejected', 'cancelled'].includes(r.status)
const FILTERS = [
  ['open', 'All open', (r) => !isClosed(r)],
  ['pending', 'Received', (r) => r.status === 'pending'],
  ['approved', 'Approved', (r) => r.status === 'approved'],
  ['active', 'With collectors', (r) => ['assigned', 'in_progress'].includes(r.status)],
  ['overdue', 'Overdue', (r) => isOverdue(r)],
  ['collected', 'Completed', (r) => r.status === 'collected'],
  ['closed', 'Rejected or cancelled', (r) => ['rejected', 'cancelled'].includes(r.status)],
]

function ReportRow({ r, who, onOpen }) {
  const urgent = isUrgent(r)
  const late = isOverdue(r)
  const col = r.assigned_to ? (who[r.assigned_to] || {}).name : null
  const rep = (who[r.user_id] || {}).name
  const img = r.status === 'collected' ? r.proof_url || r.photo_url : r.photo_url

  return (
    <button type="button" onClick={onOpen}
      className="w-full text-left bg-white border border-line rounded-2xl p-3 flex gap-3"
      style={late ? { borderLeft: '4px solid #C62828' } : urgent ? { borderLeft: '4px solid #E65100' } : undefined}>
      {img
        ? <img src={img} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
        : <div className="w-14 h-14 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Recycle size={22} /></div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-bold text-ink leading-snug">
            {r.waste_type}{r.quantity && <span className="font-sans font-medium text-muted"> · {r.quantity}</span>}
          </p>
          <StatusBadge status={r.status} />
        </div>
        <p className="text-sm text-muted truncate">{r.address}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {rep && <span>{rep}</span>}
          <span className="flex items-center gap-1"><Clock size={12} />{ago(r.created_at)}</span>
          {col && <span className="text-green-800 font-semibold">{col}</span>}
          {urgent && <span className="font-semibold text-orange-800">Urgent</span>}
          {late && <span className="font-semibold text-red-700">Overdue</span>}
        </div>
      </div>
    </button>
  )
}

export default function Admin() {
  const [reports, setReports] = useState([])
  const [people, setPeople] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [page, setPage] = useState('overview')
  const [fStatus, setFStatus] = useState('open')
  const [q, setQ] = useState('')
  const [fType, setFType] = useState('')
  const [fCol, setFCol] = useState('')
  const [more, setMore] = useState(false)
  const [sheetId, setSheetId] = useState(null)

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,name,phone,role'),
    ])
    if (r.error) setLoadErr(r.error.message); else { setLoadErr(''); setReports(r.data || []) }
    if (!p.error) setPeople(p.data || [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('admin-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const who = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  const collectors = people.filter((p) => p.role === 'collector')
  const nameOf = (id) => (who[id] || {}).name || 'Collector'
  const n = (fn) => reports.filter(fn).length

  const pend = n((r) => r.status === 'pending')
  const appr = n((r) => r.status === 'approved')
  const late = n((r) => isOverdue(r))
  const active = n((r) => ['assigned', 'in_progress'].includes(r.status))
  const doneCount = n((r) => r.status === 'collected')
  const types = [...new Set(reports.map((r) => r.waste_type))]

  const sheet = sheetId ? reports.find((r) => r.id === sheetId) : null
  const sheetEl = sheet
    ? <ReportSheet r={sheet} collectors={collectors} who={who} reload={load} onClose={() => setSheetId(null)} />
    : null

  if (page === 'map' && loaded) {
    return (
      <>
        <AdminMap reports={reports} collectors={collectors} page={page} setPage={setPage} onOpen={setSheetId} />
        {sheetEl}
      </>
    )
  }

  const test = FILTERS.find((f) => f[0] === fStatus)[2]
  const term = q.trim().toLowerCase()
  const shown = reports.filter((r) =>
    test(r) &&
    (!fType || r.waste_type === fType) &&
    (!fCol || (fCol === 'none' ? !r.assigned_to : r.assigned_to === fCol)) &&
    (!term || [r.address, r.description, r.waste_type, (who[r.user_id] || {}).name].join(' ').toLowerCase().includes(term))
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

  const sub = !loaded ? ' ' : `${pend + appr} waiting on you${late ? ` · ${late} overdue` : ''}`

  return (
    <div className="max-w-md lg:max-w-3xl mx-auto">
      <div className="-mx-4 -mt-4 bg-forest text-white px-4 pt-3 pb-5">
        <h1 className="text-[24px] leading-tight font-extrabold">Dashboard</h1>
        <p className="text-sm text-white/80 min-h-[20px]">{sub}</p>
        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-white/10 divide-x divide-white/15 text-center">
          {[['Awaiting review', pend], ['With collectors', active], ['Completed', doneCount]].map(([label, v]) => (
            <div key={label} className="py-3">
              <p className="font-display text-xl font-extrabold">{v}</p>
              <p className="text-[11px] text-white/70">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-page">
        <SegTabs label="Admin sections" tabs={TABS} value={page} onChange={setPage} />
      </div>

      <div className="space-y-3 pt-1 pb-4">
        {loadErr && (
          <div role="alert" className="bg-red-50 text-red-800 rounded-xl px-3 py-2.5 text-sm flex items-center justify-between gap-3">
            <span>{loadErr}</span>
            <button type="button" onClick={load} className="font-semibold underline shrink-0">Try again</button>
          </div>
        )}
        {!loaded && <Skeleton rows={3} />}

        {loaded && page === 'overview' && (
          <>
            <div className="bg-white border border-line rounded-2xl divide-y divide-line">
              <h2 className="px-4 pt-3 pb-2 font-display font-bold text-ink">Needs your attention</h2>
              {[['Awaiting review', pend, 'pending'], ['Approved, no collector yet', appr, 'approved'], ['Overdue', late, 'overdue']].map(([label, count, key]) => (
                <button key={key} type="button" onClick={() => { setFStatus(key); setPage('reports') }}
                  className="w-full flex items-center justify-between px-4 min-h-[52px] text-left">
                  <span className="text-sm text-ink">{label}</span>
                  <span className="flex items-center gap-2">
                    <span className={`min-w-[28px] text-center text-sm font-bold px-2 py-0.5 rounded-full ${count ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-muted'}`}>{count}</span>
                    <ChevronRight size={18} className="text-muted" />
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white border border-line rounded-2xl p-4">
              <h2 className="font-display font-bold text-ink mb-2">Collector performance</h2>
              {perf.length === 0 && <p className="text-sm text-muted">No collectors yet. Set a role in Users.</p>}
              {perf.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="font-medium pb-1">Name</th><th className="font-medium pb-1">Open</th>
                      <th className="font-medium pb-1">Done</th><th className="font-medium pb-1">Rating</th>
                      <th className="font-medium pb-1">Avg h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="py-2 pr-2 truncate max-w-[110px]">{p.name}</td>
                        <td>{p.open}</td><td>{p.done}</td><td>{p.rating}</td><td>{p.avg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Analytics reports={reports} />
          </>
        )}

        {loaded && page === 'reports' && (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input className="field !pl-11" placeholder="Search address, notes or reporter" aria-label="Search reports"
                value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {FILTERS.map(([k, label, fn]) => (
                <button key={k} type="button" aria-pressed={fStatus === k} onClick={() => setFStatus(k)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 min-h-[36px] text-sm font-semibold border ${fStatus === k ? 'bg-forest text-white border-forest' : 'bg-white text-ink border-line'}`}>
                  {label} ({reports.filter(fn).length})
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setMore(!more)}
                className="text-sm font-semibold text-green-800 flex items-center gap-1.5 min-h-[40px]">
                <SlidersHorizontal size={16} /> {more ? 'Hide filters' : 'More filters'}
              </button>
              <button type="button" onClick={() => exportCsv(reports, nameOf)}
                className="text-sm font-semibold text-green-800 flex items-center gap-1.5 min-h-[40px]">
                <Download size={16} /> Export CSV
              </button>
            </div>

            {more && (
              <div className="grid grid-cols-2 gap-2">
                <select className="field" aria-label="Waste type" value={fType} onChange={(e) => setFType(e.target.value)}>
                  <option value="">All types</option>
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="field" aria-label="Collector" value={fCol} onChange={(e) => setFCol(e.target.value)}>
                  <option value="">All collectors</option>
                  <option value="none">Unassigned</option>
                  {collectors.map((c) => <option key={c.id} value={c.id}>{c.name || 'Collector'}</option>)}
                </select>
              </div>
            )}

            <p className="text-xs text-muted">Showing {shown.length} of {reports.length}</p>

            {reports.length === 0 && <Empty title="No reports yet" text="New resident reports will appear here." />}
            {reports.length > 0 && shown.length === 0 && <Empty title="No matches" text="Try a different filter or search." />}
            <div className="grid gap-3 lg:grid-cols-2">
              {shown.map((r) => <ReportRow key={r.id} r={r} who={who} onOpen={() => setSheetId(r.id)} />)}
            </div>
          </>
        )}
      </div>

      {sheetEl}
    </div>
  )
}
