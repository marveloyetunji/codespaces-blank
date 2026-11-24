export const STATUS = {
  pending: ['Received', 'bg-amber-50 text-amber-800'],
  approved: ['Approved', 'bg-teal-50 text-teal-800'],
  assigned: ['Assigned', 'bg-blue-50 text-blue-800'],
  in_progress: ['In progress', 'bg-orange-50 text-orange-800'],
  collected: ['Completed', 'bg-green-100 text-green-800'],
  rejected: ['Rejected', 'bg-red-50 text-red-800'],
  cancelled: ['Cancelled', 'bg-gray-100 text-gray-700'],
}

export function StatusBadge({ status, className = '' }) {
  const [label, cls] = STATUS[status] || [status, 'bg-gray-100 text-gray-700']
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls} ${className}`}>
      {label}
    </span>
  )
}

export function SegTabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex p-1 gap-1 rounded-xl bg-seg border border-line">
      {tabs.map(([k, text]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`flex-1 min-h-[40px] rounded-lg text-sm font-semibold transition-colors ${value === k ? 'bg-white text-green-800 seg-on' : 'text-muted'}`}>
          {text}
        </button>
      ))}
    </div>
  )
}
