import { useState, useMemo } from 'react'
import { MapPin, Camera } from 'lucide-react'
import { supabase } from './supabaseClient'
import { compressImage } from './compressImage'
import { todayStr, SLOTS } from './schedule'

const TYPES = ['Household', 'Plastic', 'Organic', 'Electronic', 'Construction', 'Hazardous', 'Other']

async function getAddress(lat, lng) {
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const key = import.meta.env.VITE_BIGDATACLOUD_KEY
  const url = key
    ? `https://api-bdc.net/data/reverse-geocode?latitude=${lat}&longitude=${lng}&localityLanguage=en&key=${key}`
    : `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  try {
    const d = await (await fetch(url)).json()
    return [d.locality, d.city, d.principalSubdivision].filter(Boolean).join(', ') || coords
  } catch {
    return coords
  }
}

export default function ReportForm({ onDone }) {
  const [loc, setLoc] = useState(null)
  const [address, setAddress] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [photo, setPhoto] = useState(null)
  const [msg, setMsg] = useState('')
  const [locating, setLocating] = useState(false)
  const [busy, setBusy] = useState(false)
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])

  const locate = () => {
    if (!navigator.geolocation) return setMsg('This device does not support location.')
    setLocating(true); setMsg('')
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude: lat, longitude: lng } = p.coords
        setLoc({ lat, lng })
        setAddress(await getAddress(lat, lng))
        setLocating(false)
      },
      (e) => {
        setLocating(false)
        setMsg(e.code === 1
          ? 'Location is blocked. Allow it in your browser settings and try again.'
          : 'Could not get your location. Move to an open area and try again.')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!loc) return setMsg('Tap "Use my location" first.')
    if (date && date < todayStr()) return setMsg('Choose today or a later date.')
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
        photo_url, lat: loc.lat, lng: loc.lng, address,
        waste_type: type, description: desc.trim(),
        preferred_date: date || null, preferred_slot: date ? (slot || null) : null,
      })
      if (error) throw error
      onDone()
    } catch (err) {
      setMsg(err.message || 'Could not submit. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Report waste</h1>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Location</p>
        <button type="button" onClick={locate} disabled={locating}
          className="field flex items-center gap-2 text-left text-green-700 font-medium">
          <MapPin size={18} />
          {locating ? 'Getting location...' : loc ? 'Update location' : 'Use my location'}
        </button>
        {address && <p className="text-sm text-gray-600">{address}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Waste type</p>
        <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        {type === 'Hazardous' && (
          <p className="text-xs text-red-600">Hazardous reports are marked urgent automatically.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Description</p>
        <textarea className="field" rows={3} placeholder="What is there and how much? (optional)"
          value={desc} onChange={(e) => setDesc(e.target.value)} />
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

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      <button disabled={busy}
        className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
        {busy ? 'Submitting...' : 'Submit report'}
      </button>
    </form>
  )
}
