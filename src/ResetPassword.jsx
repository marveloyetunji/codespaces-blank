import { useState } from 'react'
import { Lock } from 'lucide-react'
import { supabase } from './supabaseClient'
import Logo from './Logo'

export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setMsg(error.message)
    onDone()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-16">
      <Logo size={56} dark />
      <h1 className="mt-8 text-2xl font-bold text-green-700 text-center">Set a new password</h1>
      <p className="mt-2 text-sm text-gray-600 text-center max-w-xs">
        Choose a password you have not used here before.
      </p>
      <form onSubmit={submit} className="w-full max-w-sm mt-8 space-y-4">
        <div className="relative">
          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="field !pl-10" type="password" placeholder="New password (min 6 characters)"
            minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button disabled={busy}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
          {busy ? 'Saving...' : 'Save password'}
        </button>
      </form>
    </div>
  )
}
