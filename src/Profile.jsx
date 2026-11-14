import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Profile({ profile, email, onSaved }) {
  const [name, setName] = useState(profile.name || '')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)

  const flash = (m, good = true) => { setMsg(m); setOk(good) }

  const saveName = async () => {
    const { data, error } = await supabase
      .from('profiles').update({ name }).eq('id', profile.id).select().maybeSingle()
    if (error) return flash(error.message, false)
    if (data) onSaved(data)
    flash('Name updated ✅')
  }

  const savePw = async () => {
    if (pw.length < 6) return flash('Password must be at least 6 characters', false)
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return flash(error.message, false)
    setPw('')
    flash('Password changed ✅')
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white p-5 rounded-2xl shadow text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 text-green-800 text-3xl font-bold flex items-center justify-center">
          {(profile.name || email || '?')[0].toUpperCase()}
        </div>
        <p className="mt-3 font-bold text-green-800">{profile.name || 'No name'}</p>
        <p className="text-sm text-gray-500">{email}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 capitalize">
          {profile.role}
        </span>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow space-y-2">
        <p className="font-semibold text-sm">Display name</p>
        <input className="w-full border rounded-xl p-3" value={name}
          onChange={(e) => setName(e.target.value)} />
        <button onClick={saveName}
          className="w-full bg-green-700 text-white rounded-xl p-3 font-semibold">Save name</button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow space-y-2">
        <p className="font-semibold text-sm">Change password</p>
        <input className="w-full border rounded-xl p-3" type="password"
          placeholder="New password (min 6 chars)" value={pw}
          onChange={(e) => setPw(e.target.value)} />
        <button onClick={savePw}
          className="w-full bg-green-700 text-white rounded-xl p-3 font-semibold">Update password</button>
      </div>

      {msg && <p className={`text-sm text-center ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}

      <button onClick={() => supabase.auth.signOut()}
        className="w-full border border-red-300 text-red-600 rounded-xl p-3 font-semibold bg-white">
        Log out
      </button>
      <p className="text-center text-xs text-gray-400">EcoTrack v1.0 · Geolocation Waste Management</p>
    </div>
  )
}
