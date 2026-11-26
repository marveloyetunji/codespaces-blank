import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Navigation, Phone } from 'lucide-react'
import { supabase } from './supabaseClient'
import { StatusBadge } from './ui'
import Timeline from './Timeline'
import BeforeAfter from './BeforeAfter'
import { isUrgent, isOverdue } from './priority'
import { fmtPref } from './schedule'
import { ago } from './time'
import { buzz } from './haptic'

function Info({ label, children }) {
  if (!children) return null
  return (
    <div className="flex justify-between gap-4 text-sm py-2.5 border-b border-line last:border-0">
      <span className="text-muted shrink-0">{label}</span>
      <span className="text-ink text-right">{children}</span>
    </div>
  )
}

export default function ReportSheet({ r, collectors, who, onClose, reload }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [dy, setDy] = useState(0)
  const startY = useRef(null)
  const closeRef = useRef(null)
  useEffect(() => { if (closeRef.current) closeRef.current.focus() }, [])

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const update = async (patch) => {
    if (busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.from('reports').update(patch).eq('id', r.id)
    setBusy(false)
    if (error) setErr(error.message)
    else { buzz(); setRejecting(false); setReason(''); reload() }
  }

  const assign = (id) =>
    {
    if (r.status === 'in_progress' && !window.confirm('This collector has already started. Move the job to another collector?')) return
    return update(id ? { assigned_to: id, status: 'assigned' } : { assigned_to: null, status: 'approved' })
  }

  const confirmReject = () => {
    if (!reason.trim()) return setErr('Write a reason for the resident.')
    update({ status: 'rejected', rejection_reason: reason.trim() })
  }

  const rep = who[r.user_id] || {}
  const col = r.assigned_to ? (who[r.assigned_to] || {}).name || 'Collector' : null
  const declinedBy = r.declined_by ? (who[r.declined_by] || {}).name || 'A collector' : null

  const down = (e) => { startY.current = e.touches[0].clientY }
  const move = (e) => { if (startY.current != null) setDy(Math.max(0, e.touches[0].clientY - startY.current)) }
  const up = () => { if (dy > 80) onClose(); setDy(0); startY.current = null }

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 2500 }} role="dialog" aria-modal="true" aria-label="Report details">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="slide-card absolute bottom-0 inset-x-0 mx-auto max-w-md lg:max-w-lg bg-white rounded-t-[20px] overflow-y-auto"
        style={{
          maxHeight: '88dvh',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          transform: dy ? `translateY(${dy}px)` : undefined,
          transition: dy ? 'none' : 'transform .2s ease',
        }}>
        <div onTouchStart={down} onTouchMove={move} onTouchEnd={up}
          className="sticky top-0 bg-white z-10 px-4 pt-2 pb-1 flex items-center justify-between">
          <span className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-gray-300" />
          <h2 className="font-display font-bold text-ink pt-3">Report details</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 mt-2 flex items-center justify-center text-ink">
            <X size={22} />
          </button>
        </div>

        <div className="px-4 space-y-4">
          {r.status === 'collected' && r.proof_url
            ? <BeforeAfter r={r} />
            : r.photo_url && <img src={r.photo_url} alt="Waste" className="w-full h-48 object-cover rounded-2xl" />}

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-ink leading-snug">
                {r.waste_type}{r.quantity && <span className="font-sans font-medium text-muted"> · {r.quantity}</span>}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {isUrgent(r) && <span className="text-[11px] font-semibold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Urgent</span>}
                {isOverdue(r) && <span className="text-[11px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>}
              </div>
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div className="bg-white border border-line rounded-2xl px-4">
            <Info label="Reported by">{rep.name}</Info>
            <Info label="Phone">{rep.phone && <a href={`tel:${rep.phone}`} className="text-green-800 font-semibold">{rep.phone}</a>}</Info>
            <Info label="Address">{r.address}</Info>
            <Info label="Coordinates">{`${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`}</Info>
            <Info label="Notes">{r.description}</Info>
            <Info label="Preferred">{fmtPref(r)}</Info>
            <Info label="Reported">{ago(r.created_at)}</Info>
            <Info label="Collector">{col}</Info>
            <Info label="Rating">{r.rating ? `${r.rating} of 5` : ''}</Info>
          </div>

          {r.status === 'rejected' && <p className="text-sm text-red-700">Rejected: {r.rejection_reason}</p>}
          {r.status === 'cancelled' && <p className="text-sm text-muted">Cancelled by the resident: {r.cancel_reason}</p>}
          {!['rejected', 'cancelled'].includes(r.status) && (
            <div className="bg-white border border-line rounded-2xl p-4"><Timeline r={r} /></div>
          )}

          {r.status === 'pending' && !rejecting && (
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => update({ status: 'approved' })} className="btn btn-primary flex-1">Approve</button>
              <button type="button" disabled={busy} onClick={() => { setRejecting(true); setErr('') }} className="btn btn-danger flex-1">Reject</button>
            </div>
          )}

          {rejecting && (
            <div className="space-y-2">
              <label htmlFor="rej" className="text-sm font-semibold text-ink">Reason for the resident</label>
              <textarea id="rej" className="field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={confirmReject} className="btn btn-primary flex-1 !bg-red-700">Confirm reject</button>
                <button type="button" onClick={() => { setRejecting(false); setErr('') }} className="btn btn-outline">Back</button>
              </div>
            </div>
          )}

          {['approved', 'assigned', 'in_progress'].includes(r.status) && (
            <div className="space-y-2">
              <label htmlFor="asg" className="text-sm font-semibold text-ink">{r.status === 'approved' ? 'Assign a collector' : 'Reassign to another collector'}</label>
              <select id="asg" className="field" disabled={busy} value={r.assigned_to || ''} onChange={(e) => assign(e.target.value)}>
                {r.status !== 'in_progress' && <option value="">Unassigned</option>}
                {collectors.map((c) => <option key={c.id} value={c.id}>{c.name || 'Collector'}</option>)}
              </select>
              {['assigned', 'in_progress'].includes(r.status) && (
                <p className="text-xs text-muted">{r.status === 'in_progress' ? 'In progress since ' + ago(r.started_at) + '.' : r.accepted_at ? 'Accepted by the collector.' : 'Not accepted yet. Assigned ' + ago(r.assigned_at) + '.'}</p>
              )}
              {r.status === 'approved' && r.decline_reason && (
                <p className="text-xs text-amber-800">{declinedBy} declined: {r.decline_reason}. Assign another collector.</p>
              )}
            </div>
          )}

          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}

          <div className="flex gap-2">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
              target="_blank" rel="noreferrer" className="btn btn-outline flex-1"><Navigation size={16} /> Navigate</a>
            {rep.phone && <a href={`tel:${rep.phone}`} className="btn btn-outline flex-1"><Phone size={16} /> Call</a>}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
