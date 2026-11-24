import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { MapPin, Camera, ArrowLeft, RefreshCw, Home, Package, Wine, FileText, Leaf, Cpu, Hammer, ShieldAlert, Box } from 'lucide-react'
import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'
import { todayStr, SLOTS, fmtDate } from './schedule'
import { getAddress, geoMessage } from './address'
import LocationPicker from './LocationPicker'

const TYPES = [
  ['Household', Home], ['Plastic', Package], ['Glass', Wine], ['Paper', FileText], ['Organic', Leaf],
  ['Electronic', Cpu], ['Construction', Hammer], ['Hazardous', ShieldAlert], ['Other', Box],
]
const STEPS = ['Photo', 'Place', 'Details', 'Review']
const PRIMARY = 'w-full bg-green-700 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50'

function Progress({ step, onBack }) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back" className="p-1 -ml-1 text-gray-700">
          <ArrowLeft size={22} />
        </button>
      )}
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-500 mb-1.5">Step {step + 1} of 4 · {STEPS[step]}</p>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-green-700' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Heading({ title, text }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  )
}

function Line({ label, value }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 shrink-0">{label}</span>
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

export default function ReportForm({ onDone, onBack }) {
  const [step, setStep] = useState(0)
  const [loc, setLoc] = useState(null)
  const [acc, setAcc] = useState(null)
  const [manual, setManual] = useState(false)
  const [address, setAddress] = useState('')
  const [precise, setPrecise] = useState(true)
  const [finding, setFinding] = useState(false)
  const [landmark, setLandmark] = useState('')
  const [type, setType] = useState(TYPES[0][0])
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

  const goTo = (n) => { setStep(n); setMsg(''); document.getElementById('app-main')?.scrollTo(0, 0) }

  const fromPlace = () => {
    if (!loc) return setMsg('Tap "Use my location" first.')
    if (finding) return setMsg('Still finding the address. Wait a moment.')
    if (!precise && !landmark.trim()) {
      return setMsg('We could only find your town. Add a street or nearest landmark so the collector can find the spot.')
    }
    goTo(2)
  }

  const fromDetails = () => {
    if (date && date < todayStr()) return setMsg('Choose today or a later date.')
    goTo(3)
  }

  const fullAddress = [landmark.trim(), address].filter(Boolean).join(', ')

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
        <h1 className="text-2xl font-extrabold text-gray-900">Report received</h1>
        <p className="text-sm text-gray-600">The admin will review it. You will get a notification at each step.</p>
        <button onClick={() => { clearTimeout(redirect.current); onDone() }} className={PRIMARY}>View my reports</button>
      </div>
    )
  }

  const a = accuracyText(acc, manual)
  const back = step > 0 ? () => goTo(step - 1) : onBack || null

  return (
    <div className="max-w-md mx-auto space-y-5">
      <Progress step={step} onBack={back} />

      {step === 0 && (
        <>
          <Heading title="What did you find?" text="Add a photo and choose the kind of waste." />

          <label className="block rounded-2xl border-2 border-dashed border-green-700/40 bg-green-50 overflow-hidden cursor-pointer">
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Waste preview" className="w-full h-56 object-cover" />
                <span className="absolute bottom-3 right-3 bg-white rounded-full px-3 py-1.5 text-sm font-semibold text-green-700 map-float flex items-center gap-1.5">
                  <RefreshCw size={14} /> Retake
                </span>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center gap-2 text-green-700">
                <span className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center"><Camera size={26} /></span>
                <span className="font-semibold">Take a photo</span>
                <span className="text-xs text-gray-500">Helps the collector find it and bring the right gear</span>
              </div>
            )}
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => setPhoto(e.target.files[0] || null)} />
          </label>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Type of waste</p>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(([t, Icon]) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border-[1.5px] py-3 text-xs font-medium ${
                    type === t ? 'border-green-700 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-600'}`}>
                  <Icon size={22} /> {t}
                </button>
              ))}
            </div>
            {type === 'Hazardous' && (
              <p className="text-xs text-red-600">Marked urgent automatically. Do not touch it, and report from a safe distance.</p>
            )}
          </div>

          <button type="button" onClick={() => goTo(1)} className={PRIMARY}>Continue</button>
        </>
      )}

      {step === 1 && (
        <>
          <Heading title="Where is it?" text="Stand close to it, then fine-tune the pin on the map." />

          <button type="button" onClick={locate} disabled={locating}
            className={loc
              ? 'w-full border-[1.5px] border-green-700 text-green-700 rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50'
              : PRIMARY + ' flex items-center justify-center gap-2'}>
            <MapPin size={18} />
            {locating ? 'Finding the best signal...' : loc ? 'Refresh my location' : 'Use my location'}
          </button>

          {loc && <LocationPicker lat={loc.lat} lng={loc.lng} acc={acc} onMove={moveTo} />}
          {a && <p className={`text-xs ${a.tone}`}>{a.text}</p>}
          {loc && finding && <p className="text-sm text-gray-500">Finding the address...</p>}
          {loc && !finding && address && <p className="text-sm text-gray-700">{address}</p>}
          {loc && !finding && !precise && (
            <p className="text-xs text-amber-700">Only the town was found. The pin is exact, but please add a street or landmark below.</p>
          )}

          {loc && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                Street or nearest landmark{!precise && <span className="text-red-600"> (needed)</span>}
              </p>
              <input className="field" maxLength={120} placeholder="e.g. Opposite Methodist Church, Isale Oja"
                value={landmark} onChange={(e) => setLandmark(e.target.value)} />
            </div>
          )}

          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <button type="button" onClick={fromPlace} className={PRIMARY}>Continue</button>
        </>
      )}

      {step === 2 && (
        <>
          <Heading title="A few details" text="All optional, but they help the collector prepare." />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">How much?</p>
            <input className="field" placeholder="e.g. 2 bags" maxLength={40}
              value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Anything else we should know?</p>
            <textarea className="field" rows={3} placeholder="What is there and where exactly?"
              value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Preferred collection date</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="field" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
              <select className="field" value={slot} onChange={(e) => setSlot(e.target.value)} disabled={!date}>
                <option value="">Any time</option>
                {Object.entries(SLOTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500">The admin decides who collects and when. This is only a request.</p>
          </div>

          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <button type="button" onClick={fromDetails} className={PRIMARY}>Review report</button>
        </>
      )}

      {step === 3 && (
        <>
          <Heading title="Check and send" text="Make sure everything looks right." />
          {preview && <img src={preview} alt="Waste" className="w-full h-44 object-cover rounded-2xl" />}
          <div className="bg-white border border-gray-200 rounded-2xl px-4">
            <Line label="Waste type" value={type} />
            {quantity.trim() && <Line label="Quantity" value={quantity.trim()} />}
            <Line label="Location" value={fullAddress} />
            <Line label="Position" value={manual ? 'Placed by hand' : acc != null ? `GPS, about ${Math.round(acc)} m` : 'GPS'} />
            {desc.trim() && <Line label="Notes" value={desc.trim()} />}
            {date && <Line label="Preferred date" value={fmtDate(date) + (slot ? ', ' + slot : '')} />}
          </div>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <button type="button" onClick={submit} disabled={busy} className={PRIMARY}>
            {busy ? 'Submitting...' : 'Confirm and submit'}
          </button>
          <button type="button" onClick={() => goTo(0)} disabled={busy}
            className="w-full border-[1.5px] border-green-700 text-green-700 rounded-xl py-3.5 font-semibold">
            Edit details
          </button>
        </>
      )}
    </div>
  )
}
