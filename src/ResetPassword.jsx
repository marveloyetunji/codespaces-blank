import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setMsg(error.message)
    onDone()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow space-y-3">
        <h1 className="text-xl font-bold text-green-800 text-center">Set a new password</h1>
        <input className="w-full border rounded-lg p-3" type="password"
          placeholder="New password (min 6 chars)" minLength={6} required
          value={pw} onChange={(e) => setPw(e.target.value)} />
        {msg && <p className="text-red-600 text-sm">{msg}</p>}
        <button disabled={busy}
          className="w-full bg-green-700 text-white rounded-lg p-3 font-semibold disabled:opacity-50">
          {busy ? 'Saving...' : 'Save password'}
        </button>
      </form>
    </div>
  )
}
