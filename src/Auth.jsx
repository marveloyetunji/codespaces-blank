import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) setMsg(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded-2xl shadow space-y-3">
        <h1 className="text-2xl font-bold text-green-800 text-center">EcoTrack</h1>
        <p className="text-center text-gray-500 text-sm">
          {mode === 'login' ? 'Log in to continue' : 'Create your account'}
        </p>
        {mode === 'signup' && (
          <input className="w-full border rounded-lg p-3" placeholder="Full name"
            value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className="w-full border rounded-lg p-3" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg p-3" type="password"
          placeholder="Password (min 6 chars)" value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        {msg && <p className="text-red-600 text-sm">{msg}</p>}
        <button disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg p-3 font-semibold disabled:opacity-50">
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-sm text-green-700">
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  )
}
