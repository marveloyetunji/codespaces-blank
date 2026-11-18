import { useEffect, useState, useCallback } from 'react'
import { Recycle, Plus, ClipboardList, Bell, User, Star } from 'lucide-react'
import { supabase } from './supabaseClient'
import SectionTabs from './SectionTabs'
import Timeline from './Timeline'
import Track from './Track'
import Impact from './Impact'
import { Skeleton, Empty } from './Skeleton'
import { isUrgent, isOverdue } from './priority'

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
    if (error) setErr(error.message); else reload()
  }

  const late = isOverdue(r)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2"
      style={late ? { borderLeft: '4px solid #d97706' } : undefined}>
      <div className="flex gap-3">
        {r.photo_url
          ? <img src={r.photo_url} alt="" className="w-14 h-14 object-cover rounded-lg" />
          : <div className="w-14 h-14 rounded-lg bg-green-100 text-green-700 flex items-center justify-center"><Recycle size={22} /></div>}
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-semibold">
            {r.waste_type}
            {isUrgent(r) && <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">URGENT</span>}
          </p>
          <p className="text-gray-500 truncate">{r.address}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${STYLE[r.status]}`}>{LABEL(r.status)}</span>
          {late && <p className="text-xs text-amber-700 mt-1">Taking longer than usual.</p>}
        </div>
        {r.proof_url && <img src={r.proof_url} alt="Collected" className="w-14 h-14 object-cover rounded-lg border-2 border-green-700" />}
      </div>

      {full && (
        <>
          {r.status === 'rejected' && <p className="text-xs text-red-700">Rejected: {r.rejection_reason}</p>}
          {r.status === 'cancelled' && <p className="text-xs text-gray-600">Cancelled: {r.cancel_reason}</p>}
          {!['rejected', 'cancelled'].includes(r.status) && <Timeline r={r} />}
          {r.status === 'collected' && (
            r.rating
              ? <p className="text-xs text-gray-600">Your rating: <b>{r.rating} of 5</b></p>
              : <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 mr-1">Rate this service</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => rate(n)} aria-label={`${n} stars`} className="text-amber-500 p-0.5">
                      <Star size={20} />
                    </button>
                  ))}
                </div>
          )}
        </>
      )}

      {['pending', 'approved'].includes(r.status) && !cancelling && (
        <button onClick={() => { setCancelling(true); setErr('') }} className="text-xs text-red-600 underline">
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
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
              {busy ? 'Cancelling...' : 'Confirm cancel'}
            </button>
            <button onClick={() => { setCancelling(false); setErr('') }} disabled={busy}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Keep report</button>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
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

  if (view === 'history') {
    const list = reports.filter((r) => (tab === 'done' ? isClosed(r) : !isClosed(r)))
    return (
      <div className="max-w-md mx-auto space-y-3">
        <h1 className="text-xl font-bold text-gray-900">My reports</h1>
        <SectionTabs view={tab} setView={setTab} loaded={loaded}
          active={reports.filter((r) => !isClosed(r)).length}
          done={reports.filter(isClosed).length} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {!loaded && <Skeleton />}
        {list.map((r) => <ReportCard key={r.id} r={r} full reload={load} />)}
      </div>
    )
  }

  const tiles = [
    ['report', Plus, 'Report'],
    ['history', ClipboardList, 'My reports'],
    ['alerts', Bell, 'Alerts'],
    ['profile', User, 'Profile'],
  ]

  return (
    <div className="max-w-md mx-auto space-y-5">
      <p className="text-sm text-gray-500">Hello, {(name || 'there').split(' ')[0]}</p>

      <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-bold">{points}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{LEVELS[li][1]} <span className="text-gray-500 font-normal">· eco points</span></p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-1.5">
            <div className="h-1.5 bg-green-700 rounded-full"
              style={{ width: (next ? Math.round(((points - LEVELS[li][0]) / (next[0] - LEVELS[li][0])) * 100) : 100) + '%' }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">{next ? `${next[0] - points} points to ${next[1]}` : 'Top level reached'}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {tiles.map(([key, Icon, label]) => (
          <button key={key} onClick={() => go(key)} className="flex flex-col items-center gap-1.5">
            <span className="w-12 h-12 rounded-lg bg-white border border-green-700 text-green-700 flex items-center justify-center">
              <Icon size={22} />
            </span>
            <span className="text-[11px] text-gray-700">{label}</span>
          </button>
        ))}
      </div>

      <Track reports={reports} />

      <Impact reports={live} />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-green-700">Recent reports</h2>
        {reports.length > 3 && (
          <button onClick={() => go('history')} className="text-sm text-gray-500">See all</button>
        )}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!loaded && <Skeleton rows={2} />}
      {loaded && reports.length === 0 && (
        <Empty title="No reports yet" text="Tap the green button below to report waste near you." />
      )}
      {reports.slice(0, 3).map((r) => <ReportCard key={r.id} r={r} reload={load} />)}
    </div>
  )
}
