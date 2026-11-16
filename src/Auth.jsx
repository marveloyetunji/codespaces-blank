import { useState } from 'react'
import { Mail, Lock, User } from 'lucide-react'
import { supabase } from './supabaseClient'
import Logo from './Logo'

function Field({ icon: Icon, ...p }) {
  return (
    <div className="relative">
      <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input className="field !pl-10" {...p} />
    </div>
  )
}

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
    if (!email) return setMsg('Enter your email first.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setOk(!error)
    setMsg(error ? error.message : 'Reset link sent. Check your inbox and spam.')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-16 pb-8">
      <Logo size={56} dark />
      <p className="mt-2 text-lg font-bold text-gray-900">EcoTrack</p>

      <h1 className="mt-8 text-2xl font-bold text-green-700">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h1>

      <form onSubmit={submit} className="w-full max-w-sm mt-8 space-y-4">
        {mode === 'signup' && (
          <Field icon={User} placeholder="Full name" value={name}
            onChange={(e) => setName(e.target.value)} required />
        )}
        <Field icon={Mail} type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <Field icon={Lock} type="password" placeholder="Password (min 6 characters)" value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={6} required />

        {msg && <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}

        <button disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign up'}
        </button>

        {mode === 'login' && (
          <button type="button" onClick={forgot} className="w-full text-sm text-gray-700 py-2">
            Forgot password?
          </button>
        )}
      </form>

      <p className="mt-auto pt-10 text-sm text-gray-700">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button type="button" className="text-green-700 font-semibold"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
          {mode === 'login' ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  )
}
