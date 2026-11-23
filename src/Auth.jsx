import { useState, useEffect, useRef } from 'react'
import { Mail, Lock, User, Phone, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react'
import { supabase } from './supabaseClient'
import AuthHero from './AuthHero'

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
  if (!pw) return { n: 0, label: '', color: '', text: '' }
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
        <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className={`field !pl-11 ${right ? '!pr-11' : ''}`}
          style={error ? { borderColor: '#dc2626' } : undefined} {...p} />
        {right}
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}

function EyeButton({ shown, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 p-1">
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? 'text-green-700' : 'text-gray-500'}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? 'bg-green-700 text-white' : 'bg-gray-200 text-transparent'}`}>
        <Check size={11} strokeWidth={3} />
      </span>
      {children}
    </li>
  )
}

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [step, setStep] = useState(1)
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

  useEffect(() => {
    const m = document.querySelector('meta[name="theme-color"]')
    const prev = m && m.content
    if (m) m.content = '#0B3D2E'
    return () => { if (m && prev) m.content = prev }
  }, [])

  const isSignup = mode === 'signup'
  const st = strength(password)
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '')

  const v1 = () => {
    const e = {}
    if (!first.trim()) e.first = 'Enter your first name.'
    if (!last.trim()) e.last = 'Enter your last name.'
    if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address.'
    if (!digits) e.phone = 'Enter your phone number.'
    else if (digits.length < 7 || digits.length > 12) e.phone = 'Enter a valid phone number.'
    else if (dial === '+234' && digits.length !== 10) e.phone = 'Nigerian numbers have 10 digits after the 0, like 0801 234 5678.'
    return e
  }
  const v2 = () => {
    const e = {}
    if (password.length < 6) e.password = 'Use at least 6 characters.'
    if (confirm !== password) e.confirm = 'Passwords do not match.'
    return e
  }

  const doLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setMsg(error.message)
  }

  const doSignup = async () => {
    const e1 = v1()
    const e2 = v2()
    setErrors({ ...e1, ...e2 })
    if (Object.keys(e1).length) { setStep(1); return }
    if (Object.keys(e2).length) return
    const fullName = `${first.trim()} ${last.trim()}`
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: fullName, first_name: first.trim(), last_name: last.trim(), phone: dial + digits } },
    })
    if (error) return setMsg(error.message)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setStep(1)
      return setMsg('An account with this email already exists. Log in instead.')
    }
    const savedEmail = email.trim()
    if (data.session) {
      pendingEmail = savedEmail
      await supabase.auth.signOut()
      if (mounted.current) pendingEmail = null
    }
    if (mounted.current) {
      setMode('login'); setStep(1); setPassword(''); setConfirm(''); setErrors({})
      setEmail(savedEmail); setOk(true)
      setMsg(data.session
        ? 'Account created. Log in with your email and password.'
        : 'Account created. Check your email to confirm it, then log in.')
    }
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (loading) return
    if (isSignup && step === 1) {
      const e = v1()
      setErrors(e); setMsg('')
      if (!Object.keys(e).length) { setStep(2); window.scrollTo(0, 0) }
      return
    }
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
    setStep(1); setMsg(''); setErrors({}); setOk(false)
    window.scrollTo(0, 0)
  }

  const hero = !isSignup
    ? ['Welcome back', 'Log in to report waste and follow it until it is cleared.']
    : step === 1
      ? ['Create your account', 'Report waste near you and track every step.']
      : ['Choose a password', 'Keep your account and your reports safe.']

  const rules = [
    [password.length >= 6, '6 or more characters'],
    [/[A-Za-z]/.test(password), 'A letter'],
    [/\d/.test(password), 'A number'],
    [/[^A-Za-z0-9]/.test(password), 'A symbol, like @ # ! %'],
  ]

  return (
    <div className="min-h-screen flex flex-col bg-forest">
      <AuthHero title={hero[0]} text={hero[1]} compact={isSignup} />

      <div className="flex-1 bg-white rounded-t-[28px] -mt-7 relative z-10 px-6 pt-7 pb-8">
        <form onSubmit={submit} noValidate className="w-full max-w-sm mx-auto space-y-4">

          {isSignup && (
            <div className="flex items-center gap-3 mb-1">
              {step === 2 && (
                <button type="button" aria-label="Back" className="p-1 -ml-1 text-gray-700"
                  onClick={() => { setStep(1); setErrors({}); setMsg('') }}>
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 mb-1.5">
                  Step {step} of 2 · {step === 1 ? 'About you' : 'Your password'}
                </p>
                <div className="flex gap-1.5">
                  {[1, 2].map((i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-green-700' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isSignup && (
            <>
              <Field icon={Mail} type="email" placeholder="Email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} />
              <div>
                <Field icon={Lock} type={show ? 'text' : 'password'} placeholder="Password"
                  autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  right={<EyeButton shown={show} onClick={() => setShow(!show)} />} />
                <div className="text-right mt-2">
                  <button type="button" onClick={forgot} className="text-sm font-medium text-green-700">
                    Forgot password?
                  </button>
                </div>
              </div>
            </>
          )}

          {isSignup && step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field icon={User} placeholder="First name" autoComplete="given-name" value={first}
                  error={errors.first} onChange={(e) => setFirst(e.target.value)} />
                <Field icon={User} placeholder="Last name" autoComplete="family-name" value={last}
                  error={errors.last} onChange={(e) => setLast(e.target.value)} />
              </div>
              <Field icon={Mail} type="email" placeholder="Email" autoComplete="email" value={email}
                error={errors.email} onChange={(e) => setEmail(e.target.value)} />
              <div>
                <div className="flex gap-2">
                  <select className="field !w-28 !px-2 shrink-0" value={dial} aria-label="Country code"
                    onChange={(e) => setDial(e.target.value)}>
                    {COUNTRIES.map(([c, d]) => <option key={c} value={d}>{c} {d}</option>)}
                  </select>
                  <div className="relative flex-1">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="field !pl-11" type="tel" inputMode="tel" autoComplete="tel-national"
                      placeholder="Phone number" value={phone}
                      style={errors.phone ? { borderColor: '#dc2626' } : undefined}
                      onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                {errors.phone && <p className="text-xs text-red-600 mt-1.5">{errors.phone}</p>}
              </div>
            </>
          )}

          {isSignup && step === 2 && (
            <>
              <div>
                <Field icon={Lock} type={show ? 'text' : 'password'} placeholder="Password"
                  autoComplete="new-password" value={password} error={errors.password}
                  onChange={(e) => setPassword(e.target.value)}
                  right={<EyeButton shown={show} onClick={() => setShow(!show)} />} />
                {password && (
                  <div className="mt-2.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= st.n ? st.color : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <p className={`text-xs mt-1 font-medium ${st.text}`}>Password strength: {st.label}</p>
                  </div>
                )}
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {rules.map(([good, label]) => <Rule key={label} ok={good}>{label}</Rule>)}
                </ul>
              </div>
              <div>
                <Field icon={Lock} type={show ? 'text' : 'password'} placeholder="Confirm password"
                  autoComplete="new-password" value={confirm}
                  error={errors.confirm || (confirm && confirm !== password ? 'Passwords do not match.' : '')}
                  onChange={(e) => setConfirm(e.target.value)} />
                {confirm && confirm === password && (
                  <p className="text-xs text-green-700 mt-1.5">Passwords match.</p>
                )}
              </div>
            </>
          )}

          {msg && <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>{msg}</p>}

          <button disabled={loading}
            className="w-full bg-green-700 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50">
            {loading ? 'Please wait...' : !isSignup ? 'Log in' : step === 1 ? 'Continue' : 'Create account'}
          </button>
        </form>

        <div className="w-full max-w-sm mx-auto mt-6">
          {isSignup ? (
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button type="button" onClick={switchMode} className="text-green-700 font-semibold">Log in</button>
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex-1 h-px bg-gray-200" />New to EcoTrack?<span className="flex-1 h-px bg-gray-200" />
              </div>
              <button type="button" onClick={switchMode}
                className="mt-4 w-full border-[1.5px] border-green-700 text-green-700 rounded-xl py-3.5 font-semibold">
                Create an account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
