import { useState } from 'react'
import { Navigation, Camera, Play, Check, Loader2 } from 'lucide-react'
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
  const spin = <Loader2 size={18} className="animate-spin" />

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {j.status !== 'collected' && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lng}`}
            target="_blank" rel="noreferrer" aria-label="Navigate to the waste location" className="btn-icon">
            <Navigation size={20} />
          </a>
        )}

        {waiting && !declining && (
          <>
            <button type="button" disabled={busy} className="btn btn-danger"
              onClick={() => { setDeclining(true); setErr('') }}>Decline</button>
            <button type="button" onClick={accept} disabled={busy} className="btn btn-primary flex-1">
              {busy ? spin : <Check size={18} />} Accept
            </button>
          </>
        )}

        {j.status === 'assigned' && j.accepted_at && (
          <button type="button" onClick={start} disabled={busy} className="btn btn-primary flex-1">
            {busy ? spin : <Play size={18} />} Start collection
          </button>
        )}

        {j.status === 'in_progress' && (
          <label className={`btn btn-primary flex-1 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
            {busy ? spin : <Camera size={18} />} {busy ? 'Uploading' : 'Complete with photo'}
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
              onChange={(e) => { finish(e.target.files[0]); e.target.value = '' }} />
          </label>
        )}
      </div>

      {waiting && !declining && <p className="text-xs text-muted">New job. Accept it to start, or decline with a reason.</p>}
      {j.status === 'in_progress' && <p className="text-xs text-muted">You need to be within 100 m of the spot to complete.</p>}

      {waiting && declining && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-ink">Why are you declining?</p>
          <select className="field" value={sel} onChange={(e) => setSel(e.target.value)}>
            {REASONS.map((x) => <option key={x}>{x}</option>)}
          </select>
          {sel === 'Other' && (
            <input className="field" placeholder="Write your reason" maxLength={200}
              value={other} onChange={(e) => setOther(e.target.value)} />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={decline} disabled={busy} className="btn btn-primary flex-1 !bg-red-700">
              {busy && spin} Confirm decline
            </button>
            <button type="button" onClick={() => { setDeclining(false); setErr('') }} disabled={busy}
              className="btn btn-outline">Back</button>
          </div>
        </div>
      )}

      {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
    </div>
  )
}
