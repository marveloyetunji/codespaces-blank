const STEPS = [
  ['Reported', 'created_at'],
  ['Assigned', 'assigned_at'],
  ['In progress', 'started_at'],
  ['Collected', 'collected_at'],
]
const RANK = { pending: 0, assigned: 1, in_progress: 2, collected: 3 }
const fmt = (t) =>
  t ? new Date(t).toLocaleString('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

export default function Timeline({ r }) {
  const rank = RANK[r.status] ?? 0
  return (
    <div className="mt-2 space-y-0.5">
      {STEPS.map(([label, key], i) => {
        const done = i <= rank
        return (
          <div key={key} className="flex items-center gap-2 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${done ? 'bg-green-600' : 'bg-gray-300'}`} />
            <span className={done ? 'font-semibold' : 'text-gray-400'}>{label}</span>
            <span className="text-gray-500">{done ? fmt(r[key]) : ''}</span>
          </div>
        )
      })}
    </div>
  )
}
