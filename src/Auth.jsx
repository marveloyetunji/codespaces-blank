import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    setOk(false)
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) setMsg(error.message)
    setLoading(false)
  }

  const forgot = async () => {
    if (!email) { setOk(false); return setMsg('Enter your email above first.') }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setOk(!error)
    setMsg(error ? error.message : 'Reset link sent. Check your inbox and spam.')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #064e3b 0%, #059669 55%, #34d399 100%)' }}>

      <div className="text-center text-white mb-6">
        <div className="mx-auto mb-3 w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center text-4xl"
          style={{ backdropFilter: 'blur(6px)' }}>
          ♻️
        </div>
        <h1 className="text-3xl font-bold tracking-wide">EcoTrack</h1>
        <p className="text-sm opacity-90 mt-1">Report waste. Track collection. Keep your city clean.</p>
        <div className="flex justify-center gap-2 mt-4 text-xs">
          <span className="bg-white/20 px-3 py-1 rounded-full">📍 GPS reports</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">📸 Photo proof</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">⚡ Live status</span>
        </div>
      </div>

      <form onSubmit={submit}
        className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-xl space-y-3">
        <h2 className="text-lg font-bold text-green-800">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>

        {mode === 'signup' && (
          <input className="w-full border rounded-xl p-3" placeholder="Full name"
            value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className="w-full border rounded-xl p-3" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-xl p-3" type="password"
          placeholder="Password (min 6 chars)" value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={6} required />

        {msg && (
          <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>
        )}

        {mode === 'login' && (
          <button type="button" onClick={forgot} className="w-full text-sm text-gray-500">
            Forgot password?
          </button>
        )}

        <button disabled={loading}
          className="w-full bg-green-700 text-white rounded-xl p-3 font-semibold disabled:opacity-50">
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

        <button type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}
          className="w-full text-sm text-green-700">
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>

      <p className="text-white/70 text-xs mt-6">Final Year Project · Geolocation Waste Management</p>
    </div>
  )
}
