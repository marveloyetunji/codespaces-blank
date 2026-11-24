import { useEffect, useState, useCallback } from 'react'
import { MapPin, Clock, Recycle } from 'lucide-react'
import { supabase } from './supabaseClient'
import { distKm, fmtKm } from './geo'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'
import { ago } from './time'
import { StatusBadge, SegTabs } from './ui'
import JobActions from './JobActions'
import TaskDetail from './TaskDetail'
import CollectorMap from './CollectorMap'
import LocationBanner from './LocationBanner'
import { Skeleton, Empty } from './Skeleton'

const TABS = [['jobs', 'Jobs'], ['map', 'Map'], ['stats', 'Stats']]

function timeLine(j) {
  if (j.status === 'collected') return ('Completed ' + ago(j.collected_at)).trim()
  if (j.status === 'in_progress') return ('Started ' + ago(j.started_at)).trim()
  if (j.status === 'assigned') return j.accepted_at ? 'Accepted' : ('Assigned ' + ago(j.assigned_at)).trim()
  return 'Reported ' + ago(j.created_at)
}

function JobCard({ j, pos, featured, onOpen, onChanged }) {
  const away = pos && j.status !== 'collected' ? distKm(pos.lat, pos.lng, j.lat, j.lng) : null
  const urgent = isUrgent(j)
  const late = isOverdue(j)
  const stripe = late ? '#C62828' : urgent ? '#E65100' : null
  const img = j.status === 'collected' ? j.proof_url || j.photo_url : j.photo_url

  return (
    <article className="bg-white border border-line rounded-2xl overflow-hidden"
      style={stripe ? { borderLeft: `4px solid ${stripe}` } : undefined}>
      {featured && img && <img src={img} alt="" className="w-full h-32 object-cover" />}

      <button type="button" onClick={onOpen} className="w-full text-left p-3 flex gap-3">
        {!featured && (img
          ? <img src={img} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          : <div className="w-14 h-14 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0"><Recycle size={22} /></div>)}

        <div className="flex-1 min-w-0">
          {featured && <p className="text-[11px] font-bold uppercase tracking-wide text-green-800 mb-0.5">Next stop</p>}
          <div className="flex items-start justify-between gap-2">
            <p className="font-display font-bold text-ink leading-snug">
              {j.waste_type}
              {j.quantity && <span className="font-sans font-medium text-muted"> · {j.quantity}</span>}
            </p>
            <StatusBadge status={j.status} />
          </div>
          <p className="text-sm text-muted truncate">{j.address}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {away !== null && (
              <span className="flex items-center gap-1 font-semibold text-green-800"><MapPin size={13} />{fmtKm(away)}</span>
            )}
            {urgent && <span className="font-semibold text-orange-800">Urgent</span>}
            {late && <span className="font-semibold text-red-700">Overdue</span>}
            <span className="flex items-center gap-1"><Clock size={13} />{timeLine(j)}</span>
            {j.preferred_date && <span>Preferred {fmtPref(j)}</span>}
          </div>
        </div>
      </button>

      {j.status !== 'collected' && (
        <div className="px-3 pb-3"><JobActions j={j} onChanged={onChanged} /></div>
      )}
    </article>
  )
}

function Stats({ jobs }) {
  const open = jobs.filter((j) => j.status !== 'collected')
  const done = jobs.filter((j) => j.status === 'collected')
  const rated = done.filter((j) => j.rating)
  const hrs = done.filter((j) => j.started_at && j.collected_at)
    .map((j) => (new Date(j.collected_at) - new Date(j.started_at)) / 36e5)

  const day0 = new Date()
  day0.setHours(0, 0, 0, 0)
  const week = [...Array(7)].map((_, i) => {
    const d = new Date(day0)
    d.setDate(d.getDate() - (6 - i))
    const e = new Date(d)
    e.setDate(e.getDate() + 1)
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      n: done.filter((j) => j.collected_at && new Date(j.collected_at) >= d && new Date(j.collected_at) < e).length,
    }
  })
  const weekTotal = week.reduce((a, w) => a + w.n, 0)
  const max = Math.max(1, ...week.map((w) => w.n))

  const tiles = [
    ['Open now', open.length],
    ['In progress', jobs.filter((j) => j.status === 'in_progress').length],
    ['Completed, all time', done.length],
    ['Completed this week', weekTotal],
    ['Average time on site', hrs.length ? (hrs.reduce((a, b) => a + b, 0) / hrs.length).toFixed(1) + ' h' : '-'],
    [`Average rating (${rated.length} rated)`, rated.length ? (rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1) + ' / 5' : '-'],
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white border border-line rounded-2xl grid grid-cols-2">
        {tiles.map(([label, value], i) => (
          <div key={label} className={`p-4 border-line ${i % 2 === 0 ? 'border-r' : ''} ${i < 4 ? 'border-b' : ''}`}>
            <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-line rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display font-bold text-ink">Completed, last 7 days</h2>
          <span className="text-xs text-muted">{weekTotal} total</span>
        </div>
        <div className="mt-4 flex items-end gap-2 h-28">
          {week.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[11px] font-semibold text-ink">{w.n || ''}</span>
              <div className="w-full rounded-t-md bg-green-700" style={{ height: (w.n / max) * 70 + '%', minHeight: w.n ? 4 : 2, opacity: w.n ? 1 : 0.2 }} />
              <span className="text-[10px] text-muted mt-1">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Collector() {
  const [jobs, setJobs] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [page, setPage] = useState('jobs')
  const [view, setView] = useState('open')
  const [pos, setPos] = useState(null)
  const [sel, setSel] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) setLoadErr(error.message); else { setLoadErr(''); setJobs(data || []) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('collector-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const openJob = (id) => { setSel(id); document.getElementById('app-main')?.scrollTo(0, 0) }

  const selected = sel ? jobs.find((j) => j.id === sel) : null
  if (selected) {
    return <TaskDetail j={selected} pos={pos} onChanged={load} onBack={() => setSel(null)} />
  }

  if (page === 'map' && loaded) {
    return <CollectorMap jobs={jobs} pos={pos} page={page} setPage={setPage} onOpen={openJob} />
  }

  const open = jobs.filter((j) => j.status !== 'collected')
  const done = jobs.filter((j) => j.status === 'collected')
  const d = (j) => (pos ? distKm(pos.lat, pos.lng, j.lat, j.lng) : 0)
  const rank = (j) => (isOverdue(j) || isUrgent(j) ? 0 : 1)
  const list = view === 'done'
    ? done
    : [...open].sort((a, b) => rank(a) - rank(b) || d(a) - d(b))

  const sub = !loaded ? ' ' : open.length
    ? `${open.length} open · urgent first, then nearest`
    : 'Nothing waiting right now'

  return (
    <div className="max-w-md lg:max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 bg-page space-y-3">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold text-ink">My jobs</h1>
          <p className="text-sm text-muted min-h-[20px]">{sub}</p>
        </div>
        <SegTabs label="Collector sections" tabs={TABS} value={page} onChange={setPage} />
      </div>

      <div className="space-y-3 pt-1 pb-4">
        <LocationBanner />

        {loadErr && (
          <div role="alert" className="bg-red-50 text-red-800 rounded-xl px-3 py-2.5 text-sm flex items-center justify-between gap-3">
            <span>{loadErr}</span>
            <button type="button" onClick={load} className="font-semibold underline shrink-0">Try again</button>
          </div>
        )}

        {page === 'jobs' && (
          <>
            <div className="flex gap-2">
              {[['open', `Open (${open.length})`], ['done', `Completed (${done.length})`]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setView(k)} aria-pressed={view === k}
                  className={`rounded-full px-3.5 min-h-[36px] text-sm font-semibold border ${view === k ? 'bg-forest text-white border-forest' : 'bg-white text-ink border-line'}`}>
                  {label}
                </button>
              ))}
            </div>

            {!loaded && <Skeleton rows={3} />}
            {loaded && list.length === 0 && (
              <Empty title={view === 'open' ? 'No open jobs' : 'Nothing completed yet'}
                text={view === 'open' ? 'Jobs the admin assigns to you will appear here.' : 'Finished jobs will be listed here.'} />
            )}
            {list.map((j, i) => (
              <JobCard key={j.id} j={j} pos={pos} featured={view === 'open' && i === 0}
                onOpen={() => openJob(j.id)} onChanged={load} />
            ))}
          </>
        )}

        {page === 'stats' && (loaded ? <Stats jobs={jobs} /> : <Skeleton rows={2} />)}
      </div>
    </div>
  )
}
