import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Community() {
  const [s, setS] = useState(null)

  useEffect(() => {
    supabase.rpc('community_stats').then(({ data, error }) => {
      if (!error && data) setS(data)
    })
  }, [])

  if (!s || !s.reports) return null

  return (
    <div className="bg-green-100 rounded-xl p-3">
      <p className="text-xs font-semibold text-green-800 mb-2">Across EcoTrack</p>
      <div className="grid grid-cols-3 text-center">
        {[[s.reports, 'reports made'], [s.collected, 'collected'], [s.residents, 'residents']].map(([n, l]) => (
          <div key={l}>
            <p className="text-xl font-bold text-green-800">{n}</p>
            <p className="text-[11px] text-green-800/80">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
