import { useState } from 'react'
import { LogOut, ChevronRight, ArrowLeft, User, Lock, Recycle, HelpCircle, Mail } from 'lucide-react'
import { supabase } from './supabaseClient'

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
  ['How do I report waste?', 'Tap the green button, allow location, choose the type, add a photo and submit.'],
  ['What happens after I submit?', 'An admin reviews it, approves or rejects it, then assigns a collector. You get a notification at each step.'],
  ['Why was my report rejected?', 'Open the report. The admin writes the reason there.'],
  ['Can I cancel a report?', 'Yes, but only while it is still marked Submitted.'],
  ['How do I rate a collection?', 'When a report is collected, open My reports and tap the stars.'],
  ['The app cannot find my location', 'Allow location for this site in your browser settings, then try again in an open area.'],
]

function Page({ title, onBack, children }) {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Back" className="p-1 -ml-1"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      {children}
    </div>
  )
}

function Row({ icon: Icon, label, onClick, href }) {
  const cls = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-3 flex items-center gap-3 text-left'
  const inner = (
    <>
      <Icon size={20} className="text-green-700" />
      <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
      <ChevronRight size={18} className="text-gray-400" />
    </>
  )
  return href
    ? <a href={href} className={cls}>{inner}</a>
    : <button onClick={onClick} className={cls}>{inner}</button>
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
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      {msg && <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}
      <button onClick={save} disabled={busy}
        className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
        {busy ? 'Saving...' : 'Save'}
      </button>
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
      <input className="field" type="password" placeholder="New password (min 6 characters)"
        value={pw} onChange={(e) => setPw(e.target.value)} />
      {msg && <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}
      <button onClick={save} disabled={busy}
        className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
        {busy ? 'Saving...' : 'Update password'}
      </button>
    </Page>
  )
}

export default function Profile({ profile, email, onSaved }) {
  const [view, setView] = useState(null)
  const back = () => setView(null)

  if (view === 'name') return <NameEdit profile={profile} onSaved={onSaved} onBack={back} />
  if (view === 'password') return <PasswordEdit onBack={back} />

  if (view === 'guide') return (
    <Page title="Waste sorting guide" onBack={back}>
      {GUIDE.map(([t, d]) => (
        <div key={t} className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="font-semibold text-green-700">{t}</p>
          <p className="text-sm text-gray-600 mt-0.5">{d}</p>
        </div>
      ))}
    </Page>
  )

  if (view === 'faq') return (
    <Page title="FAQ" onBack={back}>
      {FAQ.map(([q, a]) => (
        <div key={q} className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="font-semibold text-gray-900 text-sm">{q}</p>
          <p className="text-sm text-gray-600 mt-0.5">{a}</p>
        </div>
      ))}
    </Page>
  )

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-4">My Profile</h1>
        <div className="mx-auto w-20 h-20 rounded-full bg-green-700 text-white text-3xl font-bold flex items-center justify-center">
          {(profile.name || email || '?')[0].toUpperCase()}
        </div>
        <p className="mt-3 text-lg font-bold text-gray-900">{profile.name || 'No name'}</p>
        <p className="text-sm text-gray-500 capitalize">{profile.role} account</p>
        <button onClick={() => setView('name')} className="text-sm text-green-700 font-medium mt-1">Edit my profile</button>
      </div>

      <div className="space-y-2">
        <Row icon={User} label="Edit name" onClick={() => setView('name')} />
        <Row icon={Lock} label="Change password" onClick={() => setView('password')} />
        <Row icon={Recycle} label="Waste sorting guide" onClick={() => setView('guide')} />
        <Row icon={HelpCircle} label="FAQ" onClick={() => setView('faq')} />
        <Row icon={Mail} label="Contact us"
          href={`mailto:${CONTACT_EMAIL}?subject=EcoTrack%20support`} />
      </div>

      <button onClick={() => supabase.auth.signOut()}
        className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
        <LogOut size={18} /> Log out
      </button>
      <p className="text-center text-xs text-gray-400">{email} · EcoTrack v1.0</p>
    </div>
  )
}
