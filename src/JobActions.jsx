import { useState } from 'react'
import { Navigation, Camera, Play, Check, X } from 'lucide-react'
import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'
import { distKm, fmtKm, getPos } from './geo'
import { buzz } from './haptic'

const REASONS = ['Too far from my area', 'Vehicle not available', 'Unsafe or hazardous site', 'Other']

export default function JobActions({ j, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [declining, setDeclining] = useState(false)
  const [sel, setSel] = useState(REASONS[0])
  const [other, setOther] = useState('')

  const accept = async () => {
    if (busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('accept_job', { p_id: j.id })
    setBusy(false)
    if (error) setErr(error.message); else { buzz(); onChanged() }
  }

  const decline = async () => {
    const reason = sel === 'Other' ? other.trim() : sel
    if (!reason) return setErr('Please write a reason.')
    if (busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('decline_job', { p_id: j.id, p_reason: reason })
    setBusy(false)
    if (error) setErr(error.message); else { setDeclining(false); onChanged() }
  }

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

  const waiting = j.status === 'assigned' && !j.accepted_at

  return (
    <div className="space-y-2">
      {j.status !== 'collected' && (
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lng}`}
          target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 border border-green-700 text-green-700 rounded-lg py-2 text-sm font-semibold">
          <Navigation size={16} /> Navigate
        </a>
      )}

      {waiting && !declining && (
        <>
          <p className="text-xs text-amber-700">New job. Accept it to start, or decline with a reason.</p>
          <div className="flex gap-2">
            <button onClick={accept} disabled={busy}
              className="flex-1 bg-green-700 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              <Check size={16} /> {busy ? 'Please wait...' : 'Accept'}
            </button>
            <button onClick={() => { setDeclining(true); setErr('') }} disabled={busy}
              className="flex-1 border border-red-300 text-red-600 rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
              <X size={16} /> Decline
            </button>
          </div>
        </>
      )}

      {waiting && declining && (
        <div className="space-y-2 border-t border-gray-100 pt-2">
          <p className="text-xs font-medium text-gray-700">Why are you declining?</p>
          <select className="field !p-2 text-sm" value={sel} onChange={(e) => setSel(e.target.value)}>
            {REASONS.map((x) => <option key={x}>{x}</option>)}
          </select>
          {sel === 'Other' && (
            <input className="field !p-2 text-sm" placeholder="Write your reason" maxLength={200}
              value={other} onChange={(e) => setOther(e.target.value)} />
          )}
          <div className="flex gap-2">
            <button onClick={decline} disabled={busy}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
              {busy ? 'Declining...' : 'Confirm decline'}
            </button>
            <button onClick={() => { setDeclining(false); setErr('') }} disabled={busy}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Back</button>
          </div>
        </div>
      )}

      {j.status === 'assigned' && j.accepted_at && (
        <>
          <p className="text-xs text-green-700">You accepted this job.</p>
          <button onClick={start} disabled={busy}
            className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Play size={16} /> {busy ? 'Starting...' : 'Start collection'}
          </button>
        </>
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
