import { useEffect, useState, useCallback } from 'react'
import { Recycle, Plus, ClipboardList, Bell, User, Star } from 'lucide-react'
import { supabase } from './supabaseClient'
import SectionTabs from './SectionTabs'
import Track from './Track'
import Timeline from './Timeline'
import { Skeleton, Empty } from './Skeleton'
import { isUrgent, isOverdue } from './priority'

const STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-teal-50 text-teal-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-700',
}
const LABEL = (s) => (s === 'pending' ? 'Submitted' : s.replace('_', ' '))
const isClosed = (r) => ['collected', 'rejected'].includes(r.status)
const LEVELS = [[0, 'Seedling'], [50, 'Sprout'], [150, 'Eco Warrior'], [300, 'Eco Hero']]

function ReportCard({ r, full, reload }) {
  const [err, setErr] = useState('')

  const cancel = async () => {
    if (!window.confirm('Cancel this report?')) return
    const { error } = await supabase.from('reports').delete().eq('id', r.id)
    if (error) setErr(error.message); else reload()
  }
  const rate = async (n) => {
    const { error } = await supabase.rpc('rate_report', { p_id: r.id, p_rating: n })
    if (error) setErr(error.message); else reload()
  }

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
          </p>
          <p className="text-gray-500 truncate">{r.address}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs capitalize ${STYLE[r.status]}`}>{LABEL(r.status)}</span>
        </div>
        {r.proof_url && <img src={r.proof_url} alt="Collected" className="w-14 h-14 object-cover rounded-lg border-2 border-green-700" />}
      </div>

      {full && (
        <>
          {r.status === 'rejected'
            ? <p className="text-xs text-red-700">Rejected: {r.rejection_reason}</p>
            : <Timeline r={r} />}
          {r.status === 'pending' && (
            <button onClick={cancel} className="text-xs text-red-600 underline">Cancel report</button>
          )}
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
          {err && <p className="text-xs text-red-600">{err}</p>}
        </>
      )}
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

  const collected = reports.filter((r) => r.status === 'collected')
  const points = reports.length * 10 + collected.length * 20 + reports.filter((r) => r.photo_url).length * 5
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

      <div className="bg-green-700 text-white rounded-xl p-4">
        <p className="text-sm opacity-90">Eco points</p>
        <p className="text-3xl font-bold">{points}</p>
        <p className="text-xs opacity-90 mt-1">
          {LEVELS[li][1]}{next ? ` · ${next[0] - points} to ${next[1]}` : ' · top level'}
        </p>
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
