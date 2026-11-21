import { useEffect, useState, useCallback } from 'react'
import { MapPinOff } from 'lucide-react'
import { geoMessage } from './address'

export default function LocationBanner() {
  const [code, setCode] = useState(0)
  const [checking, setChecking] = useState(false)

  const check = useCallback(() => {
    if (!navigator.geolocation) return setCode(3)
    setChecking(true)
    navigator.geolocation.getCurrentPosition(
      () => { setCode(0); setChecking(false) },
      (e) => { setCode(e.code); setChecking(false) },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    check()
    let status = null
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((s) => { status = s; s.onchange = check })
        .catch(() => {})
    }
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (status) status.onchange = null
    }
  }, [check])

  if (!code) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
      <MapPinOff size={20} className="text-amber-700 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-800">Location is off</p>
        <p className="text-amber-800/90 mt-0.5">{geoMessage(code)} Distances, directions and the 100 m check need it.</p>
        <button onClick={check} disabled={checking}
          className="mt-2 text-sm font-semibold text-green-700 disabled:opacity-50">
          {checking ? 'Checking...' : 'Try again'}
        </button>
      </div>
    </div>
  )
}
