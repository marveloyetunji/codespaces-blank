export function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-white p-3 rounded-xl shadow flex gap-3 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-xl" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Empty({ icon = '🗑️', title, text }) {
  return (
    <div className="bg-white rounded-2xl shadow p-8 text-center">
      <div className="text-5xl mb-2">{icon}</div>
      <p className="font-semibold text-green-800">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  )
}

export function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white"
      style={{ background: 'linear-gradient(160deg, #064e3b, #059669 60%, #34d399)' }}>
      <div className="text-6xl animate-pulse">♻️</div>
      <p className="mt-3 font-bold tracking-wide">EcoTrack</p>
    </div>
  )
}
