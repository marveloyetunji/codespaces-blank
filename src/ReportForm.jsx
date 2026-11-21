import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { MapPin, Camera, ArrowLeft } from 'lucide-react'
import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'
import { todayStr, SLOTS, fmtDate } from './schedule'
import { getAddress, geoMessage } from './address'
import LocationPicker from './LocationPicker'

const TYPES = ['Household', 'Plastic', 'Glass', 'Paper', 'Organic', 'Electronic', 'Construction', 'Hazardous', 'Other']

function Line({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}

function accuracyText(acc, manual) {
  if (manual) return { text: 'Pin placed by hand.', tone: 'text-gray-600' }
  if (acc == null) return null
  const n = Math.round(acc)
  if (acc <= 20) return { text: `Good signal, accurate to about ${n} m.`, tone: 'text-green-700' }
  if (acc <= 50) return { text: `Fair signal, about ${n} m. Check the pin is on the right spot.`, tone: 'text-amber-700' }
  return { text: `Weak signal, about ${n} m. Move the pin to the exact spot, or try again outside.`, tone: 'text-red-600' }
}

export default function ReportForm({ onDone }) {
  const [step, setStep] = useState('form')
  const [loc, setLoc] = useState(null)
  const [acc, setAcc] = useState(null)
  const [manual, setManual] = useState(false)
  const [address, setAddress] = useState('')
  const [precise, setPrecise] = useState(true)
  const [finding, setFinding] = useState(false)
  const [landmark, setLandmark] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [quantity, setQuantity] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [photo, setPhoto] = useState(null)
  const [msg, setMsg] = useState('')
  const [locating, setLocating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  const watch = useRef({ id: null, timer: null })
  const addrReq = useRef(0)
  const redirect = useRef(null)

  const stopWatch = () => {
    if (watch.current.id != null) navigator.geolocation.clearWatch(watch.current.id)
    clearTimeout(watch.current.timer)
    watch.current = { id: null, timer: null }
  }
  useEffect(() => stopWatch, [])
  useEffect(() => () => clearTimeout(redirect.current), [])

  const lookup = useCallback(async (lat, lng) => {
    const id = ++addrReq.current
    setFinding(true)
    const a = await getAddress(lat, lng)
    if (id !== addrReq.current) return
    setAddress(a.text); setPrecise(a.precise); setFinding(false)
  }, [])

  const locate = () => {
    if (!navigator.geolocation) return setMsg('This device does not support location.')
    stopWatch()
    setLocating(true); setMsg(''); setManual(false)
    let best = null

    const finish = () => {
      stopWatch()
      setLocating(false)
      if (best) lookup(best.lat, best.lng)
    }

    watch.current.id = navigator.geolocation.watchPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }
        if (!best || c.acc < best.acc) {
          best = c
          setLoc({ lat: c.lat, lng: c.lng })
          setAcc(c.acc)
        }
        if (c.acc <= 15) finish()
      },
      (e) => {
        if (best) return finish()
        stopWatch()
        setLocating(false)
        setMsg(geoMessage(e.code))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
    watch.current.timer = setTimeout(finish, 12000)
  }

  const moveTo = useCallback((lat, lng) => {
    setLoc({ lat, lng })
    setManual(true)
    setAcc(null)
    lookup(lat, lng)
  }, [lookup])

  const fullAddress = [landmark.trim(), address].filter(Boolean).join(', ')

  const review = (e) => {
    e.preventDefault()
    if (!loc) return setMsg('Tap "Use my location" first.')
    if (finding) return setMsg('Still finding the address. Wait a moment.')
    if (!precise && !landmark.trim()) {
      return setMsg('We could only find your town. Add a street or nearest landmark so the collector can find the spot.')
    }
    if (date && date < todayStr()) return setMsg('Choose today or a later date.')
    setMsg('')
    setStep('confirm')
    window.scrollTo(0, 0)
  }

  const submit = async () => {
    if (busy) return
    setBusy(true); setMsg('')
    try {
      const { data: near } = await supabase.rpc('count_nearby_reports', {
        p_lat: loc.lat, p_lng: loc.lng, p_meters: 50,
      })
      if (near > 0 && !window.confirm('A similar open report already exists within 50 m of this spot. Submit anyway?')) {
        setBusy(false); return
      }
      let photo_url = null
      if (photo) {
        const { data: u } = await supabase.auth.getUser()
        const path = `${u.user.id}/${Date.now()}.jpg`
        const { error: upErr } = await supabase.storage
          .from('waste-photos')
          .upload(path, await compressImage(photo), { contentType: 'image/jpeg' })
        if (upErr) throw upErr
        photo_url = supabase.storage.from('waste-photos').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('reports').insert({
        photo_url, lat: loc.lat, lng: loc.lng, address: fullAddress,
        waste_type: type, description: desc.trim(),
        quantity: quantity.trim() || null,
        preferred_date: date || null, preferred_slot: date ? (slot || null) : null,
      })
      if (error) throw error
      setBusy(false)
      setDone(true)
      if (navigator.vibrate) navigator.vibrate([60, 40, 60])
      redirect.current = setTimeout(onDone, 2500)
    } catch (err) {
      setMsg(err.message || 'Could not submit. Check your connection and try again.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center pt-16 space-y-4">
        <div className="success-pop mx-auto w-24 h-24 rounded-full bg-green-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className="success-draw" d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Report received</h1>
        <p className="text-sm text-gray-600">The admin will review it. You will get a notification at each step.</p>
        <button onClick={() => { clearTimeout(redirect.current); onDone() }}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold">View my reports</button>
      </div>
    )
  }

  const a = accuracyText(acc, manual)

  if (step === 'confirm') {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('form')} aria-label="Back" className="p-1 -ml-1"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-bold text-gray-900">Confirm report</h1>
        </div>
        {preview && <img src={preview} alt="Waste" className="w-full h-44 object-cover rounded-xl" />}
        <div className="bg-white border border-gray-200 rounded-xl px-3">
          <Line label="Waste type" value={type} />
          {quantity.trim() && <Line label="Quantity" value={quantity.trim()} />}
          <Line label="Location" value={fullAddress} />
          <Line label="Position" value={manual ? 'Placed by hand' : acc != null ? `GPS, about ${Math.round(acc)} m` : 'GPS'} />
          {desc.trim() && <Line label="Description" value={desc.trim()} />}
          {date && <Line label="Preferred date" value={fmtDate(date) + (slot ? ', ' + slot : '')} />}
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button onClick={submit} disabled={busy}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
          {busy ? 'Submitting...' : 'Confirm and submit'}
        </button>
        <button onClick={() => setStep('form')} disabled={busy}
          className="w-full border border-green-700 text-green-700 rounded-lg py-3 font-semibold">
          Edit details
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={review} className="max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Report waste</h1>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Location</p>
        <button type="button" onClick={locate} disabled={locating}
          className="field flex items-center gap-2 text-left text-green-700 font-medium">
          <MapPin size={18} />
          {locating ? 'Finding the best signal...' : loc ? 'Refresh my location' : 'Use my location'}
        </button>
        {loc && <LocationPicker lat={loc.lat} lng={loc.lng} acc={acc} onMove={moveTo} />}
        {a && <p className={`text-xs ${a.tone}`}>{a.text}</p>}
        {loc && finding && <p className="text-sm text-gray-500">Finding the address...</p>}
        {loc && !finding && address && <p className="text-sm text-gray-600">{address}</p>}
        {loc && !finding && !precise && (
          <p className="text-xs text-amber-700">Only the town was found. The pin is exact, but please add a street or landmark below.</p>
        )}
      </div>

      {loc && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Street or nearest landmark{!precise && <span className="text-red-600"> (needed)</span>}
          </p>
          <input className="field" maxLength={120} placeholder="e.g. Opposite Methodist Church, Isale Oja"
            value={landmark} onChange={(e) => setLandmark(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Waste type</p>
          <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Quantity</p>
          <input className="field" placeholder="e.g. 2 bags" maxLength={40}
            value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
      </div>
      {type === 'Hazardous' && (
        <p className="text-xs text-red-600 -mt-3">Hazardous reports are marked urgent automatically.</p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Description</p>
        <textarea className="field" rows={3} placeholder="What is there and where exactly? (optional)"
          value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Preferred collection date (optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="field" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="field" value={slot} onChange={(e) => setSlot(e.target.value)} disabled={!date}>
            <option value="">Any time</option>
            {Object.entries(SLOTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Photo</p>
        <label className="field flex items-center gap-2 text-green-700 font-medium">
          <Camera size={18} /> {photo ? 'Retake photo' : 'Take or choose a photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => setPhoto(e.target.files[0] || null)} />
        </label>
        {preview && <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />}
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      <button className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold">
        Review report
      </button>
    </form>
  )
}
