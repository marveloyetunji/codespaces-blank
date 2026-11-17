import { useState } from 'react'
import { MapPin, ListChecks, Award } from 'lucide-react'
import Logo from './Logo'

const SLIDES = [
  [MapPin, 'Report in a few taps', 'Allow location, add a photo and choose the waste type. Your report goes straight to the admin.'],
  [ListChecks, 'Follow every step', 'See when your report is approved, assigned and collected, with a notification at each step.'],
  [Award, 'Earn eco-points', 'Every report and every collection adds points. Rate the service once it is collected.'],
]

export default function Onboarding({ onDone }) {
  const [i, setI] = useState(0)
  const [Icon, title, text] = SLIDES[i]
  const last = i === SLIDES.length - 1

  const finish = () => {
    try { localStorage.setItem('onboarded', '1') } catch (e) {}
    onDone()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-12 pb-8"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}>
      <div className="flex items-center justify-between">
        <Logo size={32} dark />
        {!last && <button onClick={finish} className="text-sm text-gray-500">Skip</button>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-28 h-28 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
          <Icon size={48} strokeWidth={1.5} />
        </div>
        <h1 className="mt-8 text-2xl font-bold text-green-700">{title}</h1>
        <p className="mt-3 text-gray-600 max-w-xs">{text}</p>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {SLIDES.map((_, n) => (
          <span key={n} className={`h-2 rounded-full ${n === i ? 'w-6 bg-green-700' : 'w-2 bg-green-200'}`} />
        ))}
      </div>

      <button onClick={() => (last ? finish() : setI(i + 1))}
        className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold">
        {last ? 'Get started' : 'Next'}
      </button>
    </div>
  )
}
