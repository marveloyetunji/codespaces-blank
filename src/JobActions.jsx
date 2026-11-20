import { useState } from 'react'
import { Navigation, Camera, Play } from 'lucide-react'
import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'
import { distKm, fmtKm, getPos } from './geo'
import { buzz } from './haptic'

export default function JobActions({ j, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const start = async () => {
    if (busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.from('reports').update({ status: 'in_progress' }).eq('id', j.id)
    setBusy(false)
    if (error) setErr(error.message); else { buzz(); onChanged() }
  }

  const finish = async (file) => {
    if (!file || busy) return
    setBusy(true); setErr('')
    try {
      const here = await getPos()
      const dist = distKm(here.lat, here.lng, j.lat, j.lng)
      if (dist > 0.1 + Math.min(here.acc, 100) / 1000) {
        throw new Error('You are ' + fmtKm(dist) + ' from this report. Move within 100 m to mark it collected.')
      }
      const { data: u } = await supabase.auth.getUser()
      const path = `${u.user.id}/proof-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('waste-photos')
        .upload(path, await compressImage(file), { contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const proof_url = supabase.storage.from('waste-photos').getPublicUrl(path).data.publicUrl
      const { error } = await supabase.from('reports').update({ status: 'collected', proof_url }).eq('id', j.id)
      if (error) throw error
      buzz([60, 40, 60])
      onChanged()
    } catch (e) {
      setErr(e.message || 'Could not complete. Check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      {j.status !== 'collected' && (
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lng}`}
          target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 border border-green-700 text-green-700 rounded-lg py-2 text-sm font-semibold">
          <Navigation size={16} /> Navigate
        </a>
      )}

      {j.status === 'assigned' && (
        <button onClick={start} disabled={busy}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <Play size={16} /> {busy ? 'Starting...' : 'Start collection'}
        </button>
      )}

      {j.status === 'in_progress' && (
        <label className={`w-full bg-green-700 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2 ${busy ? 'opacity-50' : ''}`}>
          <Camera size={16} /> {busy ? 'Checking location and uploading...' : 'Take proof photo and complete'}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
            onChange={(e) => { finish(e.target.files[0]); e.target.value = '' }} />
        </label>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}
