import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Profile({ profile, email, onSaved }) {
  const [name, setName] = useState(profile.name || '')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  const [busy, setBusy] = useState(false)

  const flash = (m, good = true) => { setMsg(m); setOk(good) }

  const saveName = async () => {
    if (!name.trim()) return flash('Name cannot be empty.', false)
    setBusy(true)
    const { data, error } = await supabase.from('profiles')
      .update({ name: name.trim() }).eq('id', profile.id).select().maybeSingle()
    setBusy(false)
    if (error) return flash(error.message, false)
    if (data) onSaved(data)
    flash('Name updated.')
  }

  const savePw = async () => {
    if (pw.length < 6) return flash('Password must be at least 6 characters.', false)
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return flash(error.message, false)
    setPw('')
    flash('Password changed.')
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-700 text-white text-3xl font-bold flex items-center justify-center">
          {(profile.name || email || '?')[0].toUpperCase()}
        </div>
        <p className="mt-3 text-lg font-bold text-gray-900">{profile.name || 'No name'}</p>
        <p className="text-sm text-gray-500 capitalize">{profile.role} account</p>
        <p className="text-sm text-gray-500">{email}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Display name</p>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={saveName} disabled={busy}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
          Save name
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Change password</p>
        <input className="field" type="password" placeholder="New password (min 6 characters)"
          value={pw} onChange={(e) => setPw(e.target.value)} />
        <button onClick={savePw} disabled={busy}
          className="w-full border border-green-700 text-green-700 rounded-lg py-3 font-semibold disabled:opacity-50">
          Update password
        </button>
      </div>

      {msg && <p className={`text-sm text-center ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}

      <button onClick={() => supabase.auth.signOut()}
        className="w-full bg-white border border-gray-300 text-gray-800 rounded-lg py-3 font-semibold flex items-center justify-center gap-2">
        <LogOut size={18} /> Log out
      </button>
      <p className="text-center text-xs text-gray-400">EcoTrack v1.0</p>
    </div>
  )
}
