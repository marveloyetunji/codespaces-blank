import { useState, useEffect } from 'react'
import { LogOut, ChevronRight, ArrowLeft, User, Lock, Recycle, HelpCircle, Mail, Phone } from 'lucide-react'
import { supabase } from './supabaseClient'
import { COUNTRIES, splitPhone, checkPhone } from './phone'

const CONTACT_EMAIL = 'Flameskody@gmail.com'

const GUIDE = [
  ['Household', 'Bag it and tie it. Keep it off the road and away from drains.'],
  ['Plastic', 'Rinse bottles and containers. Keep them apart from food waste.'],
  ['Glass', 'Wrap broken glass in paper or cardboard and label it so collectors can handle it safely.'],
  ['Paper', 'Keep paper and cardboard dry and flat. Wet paper cannot be recycled.'],
  ['Organic', 'Food and garden waste. Keep it dry and covered so it does not attract pests.'],
  ['Electronic', 'Phones, batteries and cables. Never mix them with general waste.'],
  ['Construction', 'Rubble, wood and metal. Keep it clear of walkways.'],
  ['Hazardous', 'Chemicals, medical waste and sharp objects. Do not touch it. Report it from a safe distance.'],
]

const FAQ = [
  ['How do I report waste?', 'Tap the green button, add a photo, set the place, add details and send.'],
  ['What happens after I submit?', 'An admin reviews it, approves or rejects it, then assigns a collector. You get a notification at each step.'],
  ['Why was my report rejected?', 'Open the report. The admin writes the reason there.'],
  ['Can I cancel a report?', 'Yes, until a collector is assigned.'],
  ['How do I rate a collection?', 'When a report is collected, open My reports and tap the stars.'],
  ['The app cannot find my location', 'Turn on location for your phone and allow it for this site, then try again in an open area.'],
]

function Page({ title, onBack, children }) {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onBack} aria-label="Back" className="w-11 h-11 -ml-2 flex items-center justify-center text-ink">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-extrabold text-ink">{title}</h1>
      </div>
      {children}
    </div>
  )
}

function Row({ icon: Icon, label, value, onClick, href }) {
  const cls = 'w-full px-4 min-h-[56px] flex items-center gap-3 text-left'
  const inner = (
    <>
      <span className="w-9 h-9 rounded-full bg-green-100 text-green-800 flex items-center justify-center shrink-0"><Icon size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {value && <span className="block text-xs text-muted truncate">{value}</span>}
      </span>
      <ChevronRight size={18} className="text-muted" />
    </>
  )
  return href
    ? <a href={href} className={cls}>{inner}</a>
    : <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function Note({ msg, ok }) {
  if (!msg) return null
  return <p role={ok ? 'status' : 'alert'} className={`text-sm ${ok ? 'text-green-800' : 'text-red-700'}`}>{msg}</p>
}

function NameEdit({ profile, onSaved, onBack }) {
  const [name, setName] = useState(profile.name || '')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!name.trim()) { setOk(false); return setMsg('Name cannot be empty.') }
    setBusy(true)
    const { data, error } = await supabase.from('profiles')
      .update({ name: name.trim() }).eq('id', profile.id).select().maybeSingle()
    setBusy(false)
    if (error) { setOk(false); return setMsg(error.message) }
    if (data) onSaved(data)
    setOk(true); setMsg('Name updated.')
  }

  return (
    <Page title="Edit name" onBack={onBack}>
      <input className="field" aria-label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
      <Note msg={msg} ok={ok} />
      <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-block">{busy ? 'Saving' : 'Save'}</button>
    </Page>
  )
}

function PhoneEdit({ profile, onSaved, onBack }) {
  const start = splitPhone(profile.phone)
  const [dial, setDial] = useState(start.dial)
  const [num, setNum] = useState(start.num)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const r = checkPhone(dial, num)
    if (r.error) { setOk(false); return setMsg(r.error) }
    setBusy(true)
    const { data, error } = await supabase.from('profiles')
      .update({ phone: r.value }).eq('id', profile.id).select().maybeSingle()
    setBusy(false)
    if (error) { setOk(false); return setMsg(error.message) }
    if (data) onSaved(data)
    setOk(true)
    setMsg(r.value ? 'Phone number saved.' : 'Phone number removed.')
  }

  return (
    <Page title="Phone number" onBack={onBack}>
      <p className="text-sm text-muted">Admins can use this to reach you about your reports. Leave it empty and save to remove it.</p>
      <div className="flex gap-2">
        <select className="field !w-28 !px-2 shrink-0" value={dial} aria-label="Country code" onChange={(e) => setDial(e.target.value)}>
          {COUNTRIES.map(([c, d]) => <option key={c} value={d}>{c} {d}</option>)}
        </select>
        <input className="field flex-1" type="tel" inputMode="tel" aria-label="Phone number" placeholder="Phone number"
          value={num} onChange={(e) => setNum(e.target.value)} />
      </div>
      <Note msg={msg} ok={ok} />
      <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-block">{busy ? 'Saving' : 'Save'}</button>
    </Page>
  )
}

function PasswordEdit({ onBack }) {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (pw.length < 6) { setOk(false); return setMsg('Password must be at least 6 characters.') }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) { setOk(false); return setMsg(error.message) }
    setPw(''); setOk(true); setMsg('Password changed.')
  }

  return (
    <Page title="Change password" onBack={onBack}>
      <input className="field" type="password" aria-label="New password" placeholder="New password (min 6 characters)"
        value={pw} onChange={(e) => setPw(e.target.value)} />
      <Note msg={msg} ok={ok} />
      <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-block">{busy ? 'Saving' : 'Update password'}</button>
    </Page>
  )
}

export default function Profile({ profile, email, onSaved }) {
  const [view, setView] = useState(null)
  const [stats, setStats] = useState(null)
  const back = () => setView(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.from('reports').select('id,status,photo_url,rating')
      const list = data || []
      const done = list.filter((r) => r.status === 'collected')
      let out
      if (profile.role === 'collector') {
        const rated = done.filter((r) => r.rating)
        out = [['Jobs', list.length], ['Completed', done.length],
          ['Avg rating', rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(1) : '-']]
      } else if (profile.role === 'admin') {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
        out = [['Reports', list.length], ['Completed', done.length], ['Users', count || 0]]
      } else {
        const live = list.filter((r) => r.status !== 'cancelled')
        out = [['Reports', live.length], ['Collected', done.length],
          ['Eco points', live.length * 10 + done.length * 20 + live.filter((r) => r.photo_url).length * 5]]
      }
      if (alive) setStats(out)
    })()
    return () => { alive = false }
  }, [profile.id, profile.role])

  if (view === 'name') return <NameEdit profile={profile} onSaved={onSaved} onBack={back} />
  if (view === 'phone') return <PhoneEdit profile={profile} onSaved={onSaved} onBack={back} />
  if (view === 'password') return <PasswordEdit onBack={back} />

  if (view === 'guide') return (
    <Page title="Waste sorting guide" onBack={back}>
      {GUIDE.map(([t, d]) => (
        <div key={t} className="bg-white border border-line rounded-2xl p-4">
          <p className="font-display font-bold text-green-800">{t}</p>
          <p className="text-sm text-muted mt-0.5">{d}</p>
        </div>
      ))}
    </Page>
  )

  if (view === 'faq') return (
    <Page title="FAQ" onBack={back}>
      {FAQ.map(([q, a]) => (
        <div key={q} className="bg-white border border-line rounded-2xl p-4">
          <p className="font-semibold text-ink text-sm">{q}</p>
          <p className="text-sm text-muted mt-0.5">{a}</p>
        </div>
      ))}
    </Page>
  )

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center pt-2">
        <div className="mx-auto w-24 h-24 rounded-full bg-green-700 text-white text-4xl font-extrabold flex items-center justify-center font-display">
          {(profile.name || email || '?')[0].toUpperCase()}
        </div>
        <h1 className="mt-3 text-xl font-extrabold text-ink">{profile.name || 'No name'}</h1>
        <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 capitalize">{profile.role}</span>
        <p className="text-sm text-muted mt-2">{email}</p>
        <p className="text-sm text-muted">{profile.phone || 'No phone number added'}</p>
      </div>

      <div className="bg-white border border-line rounded-2xl grid grid-cols-3 divide-x divide-line text-center">
        {(stats || [['', '-'], ['', '-'], ['', '-']]).map(([label, v], i) => (
          <div key={i} className="py-3">
            <p className="font-display text-xl font-extrabold text-ink">{v}</p>
            <p className="text-[11px] text-muted min-h-[14px]">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-line rounded-2xl divide-y divide-line">
        <Row icon={User} label="Edit name" value={profile.name} onClick={() => setView('name')} />
        <Row icon={Phone} label="Phone number" value={profile.phone || 'Not added'} onClick={() => setView('phone')} />
        <Row icon={Lock} label="Change password" onClick={() => setView('password')} />
        <Row icon={Recycle} label="Waste sorting guide" onClick={() => setView('guide')} />
        <Row icon={HelpCircle} label="FAQ" onClick={() => setView('faq')} />
        <Row icon={Mail} label="Contact us" href={`mailto:${CONTACT_EMAIL}?subject=EcoTrack%20support`} />
      </div>

      <button type="button" onClick={() => supabase.auth.signOut()} className="btn btn-outline btn-block">
        <LogOut size={18} /> Log out
      </button>
      <p className="text-center text-xs text-muted">EcoTrack v1.0</p>
    </div>
  )
}
