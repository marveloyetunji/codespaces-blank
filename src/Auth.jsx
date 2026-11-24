import { useState, useEffect, useRef } from 'react'
import { Mail, Lock, User, Phone, Eye, EyeOff, Check, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from './supabaseClient'
import { SegTabs } from './ui'
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
    { n: 1, label: 'Weak', color: 'bg-red-500', text: 'text-red-700' },
    { n: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-700' },
    { n: 3, label: 'Good', color: 'bg-lime-500', text: 'text-green-800' },
    { n: 4, label: 'Strong', color: 'bg-green-600', text: 'text-green-800' },
  ][n]
}

function Err({ id, children }) {
  return (
    <p id={id} className="flex items-center gap-1 text-xs text-red-700 mt-1.5">
      <AlertCircle size={13} className="shrink-0" />{children}
    </p>
  )
}

function Field({ id, label, icon: Icon, error, right, ...p }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input id={id} className={`field !pl-11 ${right ? '!pr-12' : ''}`} aria-invalid={!!error}
          aria-describedby={error ? id + '-err' : undefined}
          style={error ? { borderColor: '#C62828' } : undefined} {...p} />
        {right}
      </div>
      {error && <Err id={id + '-err'}>{error}</Err>}
    </div>
  )
}

function EyeButton({ shown, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted">
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? 'text-green-800' : 'text-muted'}`}>
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
    const e = {}
    if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address.'
    if (!password) e.password = 'Enter your password.'
    setErrors(e)
    if (Object.keys(e).length) return
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setMsg(error.message === 'Invalid login credentials' ? 'Wrong email or password. Try again.' : error.message)
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

  const goMode = (m) => {
    if (m === mode) return
    setMode(m); setStep(1); setMsg(''); setErrors({}); setOk(false)
    window.scrollTo(0, 0)
  }

  const rules = [
    [password.length >= 6, '6 or more characters'],
    [/[A-Za-z]/.test(password), 'A letter'],
    [/\d/.test(password), 'A number'],
    [/[^A-Za-z0-9]/.test(password), 'A symbol, like @ # ! %'],
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col bg-forest">
      <AuthHero />

      <div className="flex-1 bg-green-50 -mt-6 rounded-t-[24px] relative z-10 px-6 pt-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div className="max-w-sm mx-auto">
          <SegTabs label="Account" tabs={[['login', 'Log in'], ['signup', 'Sign up']]} value={mode} onChange={goMode} />

          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            {isSignup && (
              <div className="flex items-center gap-3">
                {step === 2 && (
                  <button type="button" aria-label="Back" className="w-10 h-10 -ml-2 flex items-center justify-center text-ink"
                    onClick={() => { setStep(1); setErrors({}); setMsg('') }}>
                    <ArrowLeft size={20} />
                  </button>
                )}
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted mb-1.5">
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
                <Field id="email" label="Email" icon={Mail} type="email" inputMode="email" autoComplete="email"
                  autoCapitalize="none" placeholder="you@example.com" value={email} error={errors.email}
                  onChange={(e) => setEmail(e.target.value)} />
                <div>
                  <Field id="password" label="Password" icon={Lock} type={show ? 'text' : 'password'}
                    autoComplete="current-password" placeholder="Your password" value={password} error={errors.password}
                    onChange={(e) => setPassword(e.target.value)}
                    right={<EyeButton shown={show} onClick={() => setShow(!show)} />} />
                  <div className="text-right mt-1">
                    <button type="button" onClick={forgot} className="text-sm font-semibold text-green-800 min-h-[40px] px-1">
                      Forgot password?
                    </button>
                  </div>
                </div>
              </>
            )}

            {isSignup && step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="first" label="First name" icon={User} autoComplete="given-name" placeholder="Ada"
                    value={first} error={errors.first} onChange={(e) => setFirst(e.target.value)} />
                  <Field id="last" label="Last name" icon={User} autoComplete="family-name" placeholder="Obi"
                    value={last} error={errors.last} onChange={(e) => setLast(e.target.value)} />
                </div>
                <Field id="su-email" label="Email" icon={Mail} type="email" inputMode="email" autoComplete="email"
                  autoCapitalize="none" placeholder="you@example.com" value={email} error={errors.email}
                  onChange={(e) => setEmail(e.target.value)} />
                <div>
                  <label htmlFor="phone" className="block text-[13px] font-semibold text-ink mb-1.5">Phone number</label>
                  <div className="flex gap-2">
                    <select className="field !w-28 !px-2 shrink-0" value={dial} aria-label="Country code"
                      onChange={(e) => setDial(e.target.value)}>
                      {COUNTRIES.map(([c, d]) => <option key={c} value={d}>{c} {d}</option>)}
                    </select>
                    <div className="relative flex-1">
                      <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      <input id="phone" className="field !pl-11" type="tel" inputMode="tel" autoComplete="tel-national"
                        placeholder="0801 234 5678" value={phone} aria-invalid={!!errors.phone}
                        style={errors.phone ? { borderColor: '#C62828' } : undefined}
                        onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                  {errors.phone && <Err>{errors.phone}</Err>}
                </div>
              </>
            )}

            {isSignup && step === 2 && (
              <>
                <div>
                  <Field id="su-pw" label="Password" icon={Lock} type={show ? 'text' : 'password'}
                    autoComplete="new-password" placeholder="At least 6 characters" value={password} error={errors.password}
                    onChange={(e) => setPassword(e.target.value)}
                    right={<EyeButton shown={show} onClick={() => setShow(!show)} />} />
                  {password && (
                    <div className="mt-2.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= st.n ? st.color : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <p className={`text-xs mt-1 font-semibold ${st.text}`}>Password strength: {st.label}</p>
                    </div>
                  )}
                  <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {rules.map(([good, label]) => <Rule key={label} ok={good}>{label}</Rule>)}
                  </ul>
                </div>
                <div>
                  <Field id="su-pw2" label="Confirm password" icon={Lock} type={show ? 'text' : 'password'}
                    autoComplete="new-password" placeholder="Type it again" value={confirm}
                    error={errors.confirm || (confirm && confirm !== password ? 'Passwords do not match.' : '')}
                    onChange={(e) => setConfirm(e.target.value)} />
                  {confirm && confirm === password && (
                    <p className="text-xs text-green-800 font-semibold mt-1.5">Passwords match.</p>
                  )}
                </div>
              </>
            )}

            {msg && (
              <div role={ok ? 'status' : 'alert'}
                className={`flex gap-2 rounded-xl px-3 py-2.5 text-sm ${ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {ok ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                <span>{msg}</span>
              </div>
            )}

            <button disabled={loading} className="btn btn-primary btn-block">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Please wait' : !isSignup ? 'Log in' : step === 1 ? 'Continue' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
