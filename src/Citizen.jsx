import { useEffect, useState, useCallback } from 'react'
import { Recycle, Star, Plus, CalendarDays, MapPin, ClipboardList, ChevronRight } from 'lucide-react'
import { supabase } from './supabaseClient'
import SectionTabs from './SectionTabs'
import Timeline from './Timeline'
import Track from './Track'
import HomeMap from './HomeMap'
import Impact from './Impact'
import Community from './Community'
import BeforeAfter from './BeforeAfter'
import { Skeleton, Empty } from './Skeleton'
import { isUrgent, isOverdue } from './priority'
import { buzz } from './haptic'

const STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-teal-50 text-teal-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}
const LABEL = (s) => ({
  pending: 'Received', approved: 'Approved', assigned: 'Collector assigned',
  in_progress: 'Being attended to', collected: 'Completed',
  rejected: 'Rejected', cancelled: 'Cancelled',
}[s] || s)
const CLOSED = ['collected', 'rejected', 'cancelled']
const isClosed = (r) => CLOSED.includes(r.status)
const LEVELS = [[0, 'Seedling'], [50, 'Sprout'], [150, 'Eco Warrior'], [300, 'Eco Hero']]
const REASONS = ['Reported by mistake', 'Already cleared', 'Wrong location', 'Other']

function ReportCard({ r, full, reload }) {
  const [err, setErr] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [sel, setSel] = useState(REASONS[0])
  const [other, setOther] = useState('')
  const [busy, setBusy] = useState(false)

  const confirmCancel = async () => {
    const reason = sel === 'Other' ? other.trim() : sel
    if (!reason) return setErr('Please write a reason.')
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('cancel_report', { p_id: r.id, p_reason: reason })
    setBusy(false)
    if (error) setErr(error.message)
    else { setCancelling(false); reload() }
  }

  const rate = async (n) => {
    const { error } = await supabase.rpc('rate_report', { p_id: r.id, p_rating: n })
    if (error) setErr(error.message); else { buzz(); reload() }
  }

  const late = isOverdue(r)
  const urgent = isUrgent(r)
  const badge = `px-2.5 py-1 rounded-full text-xs font-semibold ${STYLE[r.status]}`

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
      style={late ? { borderLeft: '4px solid #d97706' } : undefined}>
      {r.photo_url && (
        <div className="relative h-36 bg-green-100">
          <img src={r.photo_url} alt="" className="w-full h-full object-cover" />
          <span className={`absolute top-2 left-2 shadow-sm ${badge}`}>{LABEL(r.status)}</span>
          {urgent && (
            <span className="absolute top-2 right-2 text-[10px] font-semibold bg-red-600 text-white px-2 py-1 rounded-full">URGENT</span>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex gap-3 items-start">
          {!r.photo_url && (
            <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <Recycle size={22} />
            </div>
          )}
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold">
              {r.waste_type}
              {!r.photo_url && urgent && <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full">URGENT</span>}
            </p>
            <p className="text-gray-500 truncate">{r.address}</p>
            {!r.photo_url && <span className={`inline-block mt-1 ${badge}`}>{LABEL(r.status)}</span>}
            {late && <p className="text-xs text-amber-700 mt-1">Taking longer than usual.</p>}
          </div>
        </div>

        {full && (
          <>
            {r.status === 'rejected' && <p className="text-xs text-red-700">Rejected: {r.rejection_reason}</p>}
            {r.status === 'cancelled' && <p className="text-xs text-gray-600">Cancelled: {r.cancel_reason}</p>}
            {r.status === 'collected' && <BeforeAfter r={r} />}
            {!['rejected', 'cancelled'].includes(r.status) && <Timeline r={r} />}
            {r.status === 'collected' && (
              r.rating
                ? <p className="text-xs text-gray-600">Your rating: <b>{r.rating} of 5</b></p>
                : <div className="flex flex-wrap items-center">
                    <span className="w-full text-xs text-muted">Rate this service</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => rate(n)} aria-label={`${n} stars`} className="text-amber-600 p-3">
                        <Star size={20} />
                      </button>
                    ))}
                  </div>
            )}
          </>
        )}

        {['pending', 'approved'].includes(r.status) && !cancelling && (
          <button onClick={() => { setCancelling(true); setErr('') }} className="text-sm font-semibold text-red-700 underline min-h-[44px]">
            Cancel report
          </button>
        )}

        {cancelling && (
          <div className="space-y-2 border-t border-gray-100 pt-2">
            <p className="text-xs font-medium text-gray-700">Why are you cancelling?</p>
            <select className="field !p-2 text-sm" value={sel} onChange={(e) => setSel(e.target.value)}>
              {REASONS.map((x) => <option key={x}>{x}</option>)}
            </select>
            {sel === 'Other' && (
              <input className="field !p-2 text-sm" placeholder="Write your reason" maxLength={200}
                value={other} onChange={(e) => setOther(e.target.value)} />
            )}
            <div className="flex gap-2">
              <button onClick={confirmCancel} disabled={busy}
                className="btn btn-primary flex-1 !bg-red-700">
                {busy ? 'Cancelling...' : 'Confirm cancel'}
              </button>
              <button onClick={() => { setCancelling(false); setErr('') }} disabled={busy}
                className="btn btn-outline">Keep report</button>
            </div>
          </div>
        )}

        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </div>
  )
}

export default function Citizen({ view = 'home', go, name }) {
  const [reports, setReports] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('active')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) setErr(error.message); else { setErr(''); setReports(data || []) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('my-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const live = reports.filter((r) => r.status !== 'cancelled')
  const collected = live.filter((r) => r.status === 'collected')
  const points = live.length * 10 + collected.length * 20 + live.filter((r) => r.photo_url).length * 5
  let li = 0
  LEVELS.forEach((l, i) => { if (points >= l[0]) li = i })
  const next = LEVELS[li + 1]
  const pct = next ? Math.round(((points - LEVELS[li][0]) / (next[0] - LEVELS[li][0])) * 100) : 100

  if (view === 'history') {
    const list = reports.filter((r) => (tab === 'done' ? isClosed(r) : !isClosed(r)))
    return (
      <div className="max-w-md mx-auto space-y-3">
        <h1 className="text-2xl font-extrabold text-gray-900">My reports</h1>
        <SectionTabs view={tab} setView={setTab} loaded={loaded}
          active={reports.filter((r) => !isClosed(r)).length}
          done={reports.filter(isClosed).length} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {!loaded && <Skeleton />}
        {list.map((r) => <ReportCard key={r.id} r={r} full reload={load} />)}
      </div>
    )
  }

  const hr = new Date().getHours()
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
  const first = (name || 'there').split(' ')[0]
  const open = reports.filter((r) => !isClosed(r)).length
  const summary = !loaded ? ' '
    : open
      ? `You have ${open} open report${open === 1 ? '' : 's'}. We will tell you at every step.`
      : 'No open reports. Spot waste near you? Report it in a minute.'

  const tiles = [
    ['schedule', CalendarDays, 'Schedule'],
    ['nearby', MapPin, 'Nearby'],
    ['history', ClipboardList, 'My reports'],
  ]

  return (
    <div className="-mx-4 -mt-4">
      <div className="bg-forest text-white px-5 pt-3 pb-16">
        <div className="max-w-md mx-auto">
          <p className="text-sm text-white/70">{greet}</p>
          <h1 className="text-[26px] leading-tight font-extrabold">{first}</h1>
          <p className="text-sm text-white/80 mt-1 min-h-[20px]">{summary}</p>

          <div className="mt-5 flex items-center gap-3 bg-white/10 rounded-2xl p-3">
            <div className="w-11 h-11 rounded-full bg-sun text-forest font-extrabold flex items-center justify-center">{points}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{LEVELS[li][1]} <span className="text-white/60 font-normal">· eco points</span></p>
              <div className="h-1.5 bg-white/20 rounded-full mt-1.5">
                <div className="h-1.5 bg-sun rounded-full" style={{ width: pct + '%' }} />
              </div>
              <p className="text-[11px] text-white/70 mt-1">{next ? `${next[0] - points} points to ${next[1]}` : 'Top level reached'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10 space-y-5 pb-2">
        <button onClick={() => go('report')}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 text-left lift">
          <span className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0">
            <Plus size={26} />
          </span>
          <span className="flex-1">
            <span className="block font-display font-bold text-gray-900">Report waste</span>
            <span className="block text-sm text-gray-500">Photo, place, done. About a minute.</span>
          </span>
          <ChevronRight size={20} className="text-gray-400" />
        </button>

        <div className="bg-white border border-line rounded-2xl grid grid-cols-3 divide-x divide-line text-center">
          {[
            ['Open', reports.filter((r) => !isClosed(r)).length],
            ['In progress', reports.filter((r) => ['assigned', 'in_progress'].includes(r.status)).length],
            ['Completed', collected.length],
          ].map(([label, v]) => (
            <button key={label} type="button" onClick={() => go('history')} className="py-3 min-h-[64px]">
              <p className="font-display text-xl font-extrabold text-ink">{v}</p>
              <p className="text-xs text-muted">{label}</p>
            </button>
          ))}
        </div>

        <button type="button" onClick={() => go('nearby')}
          className="w-full bg-white border border-line rounded-2xl px-4 min-h-[56px] flex items-center gap-3 text-left">
          <span className="w-9 h-9 rounded-full bg-green-100 text-green-800 flex items-center justify-center"><MapPin size={18} /></span>
          <span className="flex-1 text-sm font-semibold text-ink">Reports near you</span>
          <ChevronRight size={18} className="text-muted" />
        </button>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <Track reports={reports} go={go} />
        <HomeMap reports={reports} />
        <Impact reports={live} />
        <Community />

        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-gray-900">Recent reports</h2>
          {reports.length > 3 && (
            <button onClick={() => go('history')} className="text-sm font-medium text-green-700">See all</button>
          )}
        </div>
        {!loaded && <Skeleton rows={2} />}
        {loaded && reports.length === 0 && (
          <Empty title="No reports yet" text="Tap Report waste above to send your first one." />
        )}
        {reports.slice(0, 3).map((r) => <ReportCard key={r.id} r={r} reload={load} />)}
      </div>
    </div>
  )
}
