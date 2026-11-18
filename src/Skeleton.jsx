import { Leaf } from 'lucide-react'
import Logo from './Logo'

export function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-white p-3 rounded-xl shadow flex gap-3 animate-pulse">
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
    <div className="bg-white rounded-xl shadow p-8 text-center">
      <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center"><Leaf size={28} strokeWidth={1.5} /></div>
      <p className="font-semibold text-gray-800">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  )
}

export function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-700">
      <Logo size={56} />
      <p className="mt-3 font-semibold text-white tracking-wide">EcoTrack</p>
    </div>
  )
}
