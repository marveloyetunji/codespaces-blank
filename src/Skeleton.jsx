import Logo from './Logo'
import Illustration from './Illustration'

export function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 p-3 rounded-xl flex gap-3 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-lg" />
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

export function Empty({ title, text }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
      <Illustration />
      <p className="font-semibold text-gray-800 mt-2">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  )
}

export function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Logo size={56} dark />
      <p className="mt-3 font-bold text-gray-900 tracking-wide">EcoTrack</p>
    </div>
  )
}
