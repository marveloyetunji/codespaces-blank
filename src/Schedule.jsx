import { useEffect, useState, useCallback } from 'react'
import { CalendarDays } from 'lucide-react'
import { supabase } from './supabaseClient'
import { Skeleton, Empty } from './Skeleton'
import { todayStr, SLOTS, fmtDate } from './schedule'

const STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-teal-50 text-teal-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-orange-50 text-orange-700',
  collected: 'bg-green-100 text-green-800',
  rejected: 'bg-red-50 text-red-700',
}
const LABEL = (s) => ({ pending: 'Received', approved: 'Approved', assigned: 'Collector assigned', in_progress: 'Being attended to', collected: 'Completed', rejected: 'Rejected' }[s] || s)
const CAN_EDIT = ['pending', 'approved', 'assigned']

function Item({ r, reload }) {
  const [edit, setEdit] = useState(false)
  const [date, setDate] = useState(r.preferred_date || '')
  const [slot, setSlot] = useState(r.preferred_slot || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!date) return setErr('Pick a date.')
    if (date < todayStr()) return setErr('Choose today or a later date.')
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('reschedule_report', { p_id: r.id, p_date: date, p_slot: slot || null })
    setBusy(false)
    if (error) setErr(error.message)
    else { setEdit(false); reload() }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex gap-3 items-center">
        <div className="w-14 h-14 rounded-lg bg-green-100 text-green-800 flex flex-col items-center justify-center shrink-0">
          {r.preferred_date ? (
            <>
              <span className="text-lg font-bold leading-none">{new Date(r.preferred_date + 'T00:00:00').getDate()}</span>
              <span className="text-[10px] uppercase">{new Date(r.preferred_date + 'T00:00:00').toLocaleDateString('en', { month: 'short' })}</span>
            </>
          ) : <CalendarDays size={22} />}
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-semibold">{r.waste_type}</p>
          <p className="text-gray-500 truncate">{r.address}</p>
          <p className="text-xs text-gray-600">
            {r.preferred_date
              ? fmtDate(r.preferred_date) + (r.preferred_slot ? ' · ' + SLOTS[r.preferred_slot] : '')
              : 'No date chosen'}
          </p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs capitalize ${STYLE[r.status]}`}>{LABEL(r.status)}</span>
        </div>
      </div>

      {CAN_EDIT.includes(r.status) && !edit && (
        <button onClick={() => setEdit(true)} className="text-sm text-green-700 font-medium">
          {r.preferred_date ? 'Change date' : 'Set a date'}
        </button>
      )}

      {edit && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="field" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="field" value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="">Any time</option>
              {Object.entries(SLOTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy}
              className="flex-1 bg-green-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
              {busy ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setEdit(false); setErr('') }}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}

export default function Schedule() {
  const [reports, setReports] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) setErr(error.message); else { setErr(''); setReports(data || []) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('my-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const today = todayStr()
  const open = reports.filter((r) => !['collected', 'rejected'].includes(r.status))
  const upcoming = open.filter((r) => r.preferred_date && r.preferred_date >= today)
    .sort((a, b) => a.preferred_date.localeCompare(b.preferred_date))
  const missed = open.filter((r) => r.preferred_date && r.preferred_date < today)
  const unscheduled = open.filter((r) => !r.preferred_date)
  const past = reports.filter((r) => r.status === 'collected' && r.preferred_date).slice(0, 5)

  const Section = ({ title, list }) => list.length === 0 ? null : (
    <div className="space-y-2">
      <h2 className="font-semibold text-green-700">{title}</h2>
      {list.map((r) => <Item key={r.id} r={r} reload={load} />)}
    </div>
  )

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500">Your preferred collection dates. The admin confirms who collects.</p>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!loaded && <Skeleton rows={2} />}
      {loaded && reports.length === 0 && (
        <Empty title="Nothing scheduled" text="Report waste with the green button and pick a preferred date." />
      )}
      <Section title="Upcoming" list={upcoming} />
      <Section title="Date has passed, not collected yet" list={missed} />
      <Section title="No date chosen" list={unscheduled} />
      <Section title="Recently collected" list={past} />
    </div>
  )
}
