import { useState } from 'react'
import { supabase } from './supabaseClient'
import Logo from './Logo'

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
    setLoading(true); setMsg(''); setOk(false)
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) setMsg(error.message)
    setLoading(false)
  }

  const forgot = async () => {
    if (!email) { setOk(false); return setMsg('Enter your email first.') }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setOk(!error)
    setMsg(error ? error.message : 'Reset link sent. Check your inbox and spam.')
  }

  return (
    <div className="min-h-screen bg-green-50 flex flex-col">
      <div className="bg-green-700 px-6 pt-14 pb-10 text-white">
        <Logo size={44} />
        <h1 className="text-2xl font-bold mt-4">EcoTrack</h1>
        <p className="text-sm text-white/80 mt-1 max-w-xs">
          Report waste that has not been collected, and follow it until it is cleared.
        </p>
      </div>

      <form onSubmit={submit} className="p-6 space-y-3 w-full max-w-sm mx-auto">
        <h2 className="text-lg font-semibold">{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
        {mode === 'signup' && (
          <input className="w-full border rounded-lg p-3 bg-white" placeholder="Full name"
            value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className="w-full border rounded-lg p-3 bg-white" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg p-3 bg-white" type="password"
          placeholder="Password (min 6 characters)" value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={6} required />

        {msg && <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}

        <button disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg p-3 font-semibold disabled:opacity-50">
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        {mode === 'login' && (
          <button type="button" onClick={forgot} className="w-full text-sm text-gray-500">Forgot password?</button>
        )}
        <button type="button" className="w-full text-sm text-green-700 font-medium"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
          {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  )
}
