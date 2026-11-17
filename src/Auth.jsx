import { useState, useEffect, useRef } from 'react'
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import { supabase } from './supabaseClient'
import Logo from './Logo'

let pendingEmail = null

const COUNTRIES = [
  ['NG', '+234'], ['GH', '+233'], ['KE', '+254'], ['ZA', '+27'], ['CM', '+237'],
  ['BJ', '+229'], ['TG', '+228'], ['NE', '+227'], ['SN', '+221'], ['CI', '+225'],
  ['UG', '+256'], ['TZ', '+255'], ['EG', '+20'], ['GB', '+44'], ['US', '+1'],
  ['CA', '+1'], ['IE', '+353'], ['DE', '+49'], ['FR', '+33'], ['IN', '+91'],
  ['AE', '+971'], ['SA', '+966'], ['CN', '+86'],
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function strength(pw) {
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (!pw) return { n: 0, label: '', color: '' }
  const n = Math.min(4, Math.max(1, s - (pw.length < 6 ? 1 : 0)))
  return [
    null,
    { n: 1, label: 'Weak', color: 'bg-red-500', text: 'text-red-600' },
    { n: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' },
    { n: 3, label: 'Good', color: 'bg-lime-500', text: 'text-green-700' },
    { n: 4, label: 'Strong', color: 'bg-green-600', text: 'text-green-700' },
  ][n]
}

function Field({ icon: Icon, error, right, ...p }) {
  return (
    <div>
      <div className="relative">
        <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className={`field !pl-10 ${right ? '!pr-11' : ''}`}
          style={error ? { borderColor: '#dc2626' } : undefined} {...p} />
        {right}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function EyeButton({ shown, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

export default function Auth() {
  const [mode, setMode] = useState(pendingEmail ? 'login' : 'login')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState(pendingEmail || '')
  const [dial, setDial] = useState('+234')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(pendingEmail ? 'Account created. Log in with your email and password.' : '')
  const [ok, setOk] = useState(!!pendingEmail)
  const [loading, setLoading] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    pendingEmail = null
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const st = strength(password)
  const isSignup = mode === 'signup'

  const validate = () => {
    const e = {}
    if (!first.trim()) e.first = 'Enter your first name.'
    if (!last.trim()) e.last = 'Enter your last name.'
    if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address.'
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '')
    if (!digits) e.phone = 'Enter your phone number.'
    else if (digits.length < 7 || digits.length > 12) e.phone = 'Enter a valid phone number.'
    else if (dial === '+234' && digits.length !== 10) e.phone = 'Nigerian numbers have 10 digits after the 0, like 0801 234 5678.'
    if (password.length < 6) e.password = 'Use at least 6 characters.'
    if (confirm !== password) e.confirm = 'Passwords do not match.'
    return { e, digits }
  }

  const doLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setMsg(error.message)
  }

  const doSignup = async () => {
    const { e, digits } = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    const fullName = `${first.trim()} ${last.trim()}`
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: fullName, first_name: first.trim(), last_name: last.trim(), phone: dial + digits } },
    })
    if (error) return setMsg(error.message)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return setMsg('An account with this email already exists. Log in instead.')
    }
    const savedEmail = email.trim()
    if (data.session) {
      pendingEmail = savedEmail
      await supabase.auth.signOut()
      if (mounted.current) pendingEmail = null
    }
    if (mounted.current) {
      setMode('login'); setPassword(''); setConfirm(''); setErrors({})
      setEmail(savedEmail); setOk(true)
      setMsg(data.session
        ? 'Account created. Log in with your email and password.'
        : 'Account created. Check your email to confirm it, then log in.')
    }
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (loading) return
    setLoading(true); setMsg(''); setOk(false)
    if (isSignup) await doSignup(); else await doLogin()
    if (mounted.current) setLoading(false)
  }

  const forgot = async () => {
    if (!EMAIL_RE.test(email.trim())) { setOk(false); return setMsg('Enter your email above first.') }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setOk(!error)
    setMsg(error ? error.message : 'Reset link sent. Check your inbox and spam.')
  }

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup')
    setMsg(''); setErrors({}); setOk(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-12 pb-8">
      <Logo size={56} dark />
      <p className="mt-2 text-lg font-bold text-gray-900">EcoTrack</p>

      <h1 className="mt-6 text-2xl font-bold text-green-700">
        {isSignup ? 'Create your account' : 'Welcome back'}
      </h1>

      <form onSubmit={submit} noValidate className="w-full max-w-sm mt-6 space-y-4">
        {isSignup && (
          <div className="grid grid-cols-2 gap-3">
            <Field icon={User} placeholder="First name" autoComplete="given-name" value={first}
              error={errors.first} onChange={(e) => setFirst(e.target.value)} />
            <Field icon={User} placeholder="Last name" autoComplete="family-name" value={last}
              error={errors.last} onChange={(e) => setLast(e.target.value)} />
          </div>
        )}

        <Field icon={Mail} type="email" placeholder="Email" autoComplete="email" value={email}
          error={errors.email} onChange={(e) => setEmail(e.target.value)}
          onBlur={() => isSignup && email && setErrors((x) => ({ ...x, email: EMAIL_RE.test(email.trim()) ? '' : 'Please enter a valid email address.' }))} />

        {isSignup && (
          <div>
            <div className="flex gap-2">
              <select className="field !w-28 !px-2 shrink-0" value={dial} aria-label="Country code"
                onChange={(e) => setDial(e.target.value)}>
                {COUNTRIES.map(([c, d]) => <option key={c} value={d}>{c} {d}</option>)}
              </select>
              <div className="relative flex-1">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="field !pl-10" type="tel" inputMode="tel" autoComplete="tel-national"
                  placeholder="Phone number" value={phone}
                  style={errors.phone ? { borderColor: '#dc2626' } : undefined}
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
          </div>
        )}

        <div>
          <Field icon={Lock} type={show ? 'text' : 'password'}
            placeholder={isSignup ? 'Password (min 6 characters)' : 'Password'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password} error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
            right={<EyeButton shown={show} onClick={() => setShow(!show)} />} />
          {isSignup && password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= st.n ? st.color : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className={`text-xs mt-1 font-medium ${st.text}`}>Password strength: {st.label}</p>
            </div>
          )}
          {isSignup && (
            <p className="text-xs text-gray-500 mt-1">
              Use a mix of letters, numbers and symbols (like @ # ! %) for a stronger password.
            </p>
          )}
        </div>

        {isSignup && (
          <div>
            <Field icon={Lock} type={show ? 'text' : 'password'} placeholder="Confirm password"
              autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm || (confirm && confirm !== password ? 'Passwords do not match.' : '')} />
            {confirm && confirm === password && (
              <p className="text-xs text-green-700 mt-1">Passwords match.</p>
            )}
          </div>
        )}

        {msg && <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}

        <button disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
          {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Login'}
        </button>

        {!isSignup && (
          <button type="button" onClick={forgot} className="w-full text-sm text-gray-700 py-2">
            Forgot password?
          </button>
        )}
      </form>

      <p className="mt-auto pt-8 text-sm text-gray-700">
        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
        <button type="button" className="text-green-700 font-semibold" onClick={switchMode}>
          {isSignup ? 'Log in' : 'Sign up'}
        </button>
      </p>
    </div>
  )
}
