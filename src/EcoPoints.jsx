const LEVELS = [
  [0, 'Seedling', '🌱'],
  [50, 'Sprout', '🌿'],
  [150, 'Eco Warrior', '🌳'],
  [300, 'Eco Hero', '🏆'],
]

export default function EcoPoints({ reports }) {
  const collected = reports.filter((r) => r.status === 'collected')
  const points =
    reports.length * 10 + collected.length * 20 + reports.filter((r) => r.photo_url).length * 5

  let li = 0
  LEVELS.forEach((l, i) => { if (points >= l[0]) li = i })
  const cur = LEVELS[li]
  const next = LEVELS[li + 1]
  const pct = next ? Math.round(((points - cur[0]) / (next[0] - cur[0])) * 100) : 100

  const badges = [
    ['📝', 'First report', reports.length >= 1],
    ['✅', 'First clean-up', collected.length >= 1],
    ['🔥', 'Clean streak (3)', collected.length >= 3],
    ['☣️', 'Hazard spotter', reports.some((r) => r.waste_type === 'Hazardous')],
    ['⭐', 'Rater', reports.some((r) => r.rating)],
  ]

  return (
    <div className="bg-white p-4 rounded-2xl shadow space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{cur[2]}</div>
        <div className="flex-1">
          <p className="font-bold text-green-800">{cur[1]}</p>
          <p className="text-xs text-gray-500">{points} eco-points</p>
        </div>
      </div>
      <div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-2 bg-green-600 rounded-full" style={{ width: pct + '%' }} />
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          {next ? `${next[0] - points} points to ${next[1]} ${next[2]}` : 'Top level reached 🎉'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map(([icon, label, got]) => (
          <span key={label}
            className={`text-[11px] px-2 py-1 rounded-full border ${
              got ? 'bg-green-50 text-green-800 border-green-200' : 'opacity-40 border-gray-200'
            }`}>
            {icon} {label}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-gray-400">
        10 pts per report · +20 when collected · +5 with a photo
      </p>
    </div>
  )
}
