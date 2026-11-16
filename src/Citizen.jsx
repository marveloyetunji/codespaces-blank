import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'
import SectionTabs from './SectionTabs'
import EcoPoints from './EcoPoints'
import Timeline from './Timeline'
import { Skeleton, Empty } from './Skeleton'
import { compressImage } from './compressImage'

const TYPES = ['Household', 'Plastic', 'Organic', 'Electronic', 'Construction', 'Hazardous', 'Other']
const COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-teal-100 text-teal-800',
  rejected: 'bg-red-100 text-red-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  collected: 'bg-green-100 text-green-800',
}

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

export default function Citizen() {
  const [loc, setLoc] = useState(null)
  const [address, setAddress] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [reports, setReports] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState('active')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('my-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const getLocation = () => {
    setMsg('Getting location...')
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude: lat, longitude: lng } = p.coords
        setLoc({ lat, lng })
        setAddress(await getAddress(lat, lng))
        setMsg('')
      },
      () => setMsg('Allow location access in your browser settings.'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!loc) return setMsg('Tap "Use my location" first.')
    const { data: near } = await supabase.rpc('count_nearby_reports', {
      p_lat: loc.lat, p_lng: loc.lng, p_meters: 50,
    })
    if (near > 0 && !window.confirm('A similar open report already exists within 50 m of this spot. Submit anyway?')) return
    setBusy(true)
    setMsg('')
    try {
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
        photo_url,
        lat: loc.lat,
        lng: loc.lng,
        address,
        waste_type: type,
        description: desc,
      })
      if (error) throw error
      setLoc(null); setAddress(''); setDesc(''); setPhoto(null)
      setMsg('Report submitted ✅')
      load()
    } catch (err) {
      setMsg(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <form onSubmit={submit} className="bg-white p-4 rounded-2xl shadow space-y-3">
        <h2 className="font-bold text-green-800">Report waste</h2>

        <button type="button" onClick={getLocation}
          className="w-full border border-green-700 text-green-700 rounded-lg p-3">
          📍 {loc ? 'Update location' : 'Use my location'}
        </button>
        {address && <p className="text-sm text-gray-600">{address}</p>}

        <select className="w-full border rounded-lg p-3" value={type}
          onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        <textarea className="w-full border rounded-lg p-3" rows={3}
          placeholder="Describe the waste (optional)" value={desc}
          onChange={(e) => setDesc(e.target.value)} />

        <input type="file" accept="image/*" capture="environment"
          onChange={(e) => setPhoto(e.target.files[0] || null)} className="text-sm" />

        {msg && <p className="text-sm text-red-600">{msg}</p>}

        <button disabled={busy}
          className="w-full bg-green-700 text-white rounded-lg p-3 font-semibold disabled:opacity-50">
          {busy ? 'Submitting...' : 'Submit report'}
        </button>
      </form>

      <EcoPoints reports={reports} />
      <h2 className="font-bold text-green-800">My reports</h2>
      <SectionTabs view={view} setView={setView} loaded={loaded}
        active={reports.filter((x) => !['collected', 'rejected'].includes(x.status)).length}
        done={reports.filter((x) => ['collected', 'rejected'].includes(x.status)).length} />
      {!loaded && <Skeleton />}
      {loaded && reports.length === 0 && <Empty icon="🗑️" title="No reports yet" text="Spot waste? Use the form above to report it." />}
      {reports.filter((x) => (view === 'done' ? ['collected', 'rejected'].includes(x.status) : !['collected', 'rejected'].includes(x.status))).map((r) => (
        <div key={r.id} className="bg-white p-3 rounded-xl shadow flex gap-3">
          {r.photo_url && <img src={r.photo_url} className="w-16 h-16 object-cover rounded" />}
          {r.proof_url && <img src={r.proof_url} className="w-16 h-16 object-cover rounded border-2 border-green-600" />}
          <div className="flex-1 text-sm">
            <p className="font-semibold">{r.waste_type}</p>
            <p className="text-gray-600">{r.address}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${COLORS[r.status]}`}>
              {(r.status === 'pending' ? 'submitted' : r.status.replace('_', ' '))}
            </span>
              {r.status === 'rejected'
                ? <p className="mt-2 text-xs text-red-700">Rejected: {r.rejection_reason}</p>
                : <Timeline r={r} />}
            {r.status === 'collected' && (
              <div className="mt-2 text-lg">
                {r.rating ? (
                  <span className="text-yellow-500">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    <span className="text-xs text-gray-500"> your rating</span>
                  </span>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500">Rate this service:</p>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} className="text-yellow-500 text-2xl px-0.5"
                        onClick={async () => {
                          await supabase.rpc('rate_report', { p_id: r.id, p_rating: n })
                          load()
                        }}>
                        ☆
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {r.status === 'pending' && (
              <button
                className="block mt-2 text-xs text-red-600 underline"
                onClick={async () => {
                  if (!window.confirm('Cancel this report?')) return
                  await supabase.from('reports').delete().eq('id', r.id)
                  load()
                }}
              >
                Cancel report
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
