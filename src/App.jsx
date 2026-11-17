import { useEffect, useState } from 'react'
import { Home, User, Truck, LayoutDashboard, Users as UsersIcon, ClipboardList, Bell as BellIcon, Plus, CalendarDays } from 'lucide-react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import ResetPassword from './ResetPassword'
import Toaster from './Toaster'
import InstallBanner from './InstallBanner'
import { Splash } from './Skeleton'
import Logo from './Logo'
import Citizen from './Citizen'
import ReportForm from './ReportForm'
import Admin from './Admin'
import Collector from './Collector'
import Users from './Users'
import Profile from './Profile'
import Onboarding from './Onboarding'
import Schedule from './Schedule'
import Bell from './Bell'
import Notifications from './Notifications'

const TABS = {
  citizen: [['home', Home, 'Home'], ['schedule', CalendarDays, 'Schedule'], ['report', Plus, 'Report', true], ['history', ClipboardList, 'Reports'], ['profile', User, 'Profile']],
  collector: [['home', Truck, 'Jobs'], ['alerts', BellIcon, 'Alerts'], ['profile', User, 'Profile']],
  admin: [['home', LayoutDashboard, 'Dashboard'], ['users', UsersIcon, 'Users'], ['alerts', BellIcon, 'Alerts'], ['profile', User, 'Profile']],
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [tab, setTab] = useState('home')
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem('onboarded') === '1' } catch (e) { return true }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); setTab('home'); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session])

  if (recovering) return <ResetPassword onDone={() => setRecovering(false)} />
  if (!ready) return <Splash />
  if (!session) return seen ? <Auth /> : <Onboarding onDone={() => setSeen(true)} />
  if (!profile) return <Splash />

  const role = TABS[profile.role] ? profile.role : 'citizen'

  return (
    <div className="min-h-screen bg-green-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 pb-2 flex items-center gap-2 sticky top-0 z-[1100]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <Logo size={30} dark />
        <div className="leading-tight">
          <p className="font-bold text-gray-900">EcoTrack</p>
          <p className="text-[11px] text-gray-500 capitalize">{role}</p>
        </div>
        <Bell userId={session.user.id} onOpen={() => setTab('alerts')} />
      </header>

      <Toaster role={role} />
      <InstallBanner />

      <main className="p-4">
        {role === 'citizen' && tab === 'home' && <Citizen view="home" go={setTab} name={profile.name} />}
        {role === 'citizen' && tab === 'history' && <Citizen view="history" go={setTab} />}
        {role === 'citizen' && tab === 'schedule' && <Schedule />}
        {role === 'citizen' && tab === 'report' && <ReportForm onDone={() => setTab('history')} />}
        {role === 'collector' && tab === 'home' && <Collector />}
        {role === 'admin' && tab === 'home' && <Admin />}
        {role === 'admin' && tab === 'users' && <Users />}
        {tab === 'alerts' && <Notifications userId={session.user.id} />}
        {tab === 'profile' && <Profile profile={profile} email={session.user.email} onSaved={setProfile} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-[1100] bg-white border-t border-gray-200 flex items-end"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS[role].map(([key, Icon, label, center]) =>
          center ? (
            <button key={key} onClick={() => setTab(key)} aria-label={label}
              className="flex-1 flex justify-center pb-3">
              <span className="-mt-7 w-14 h-14 rounded-full bg-green-800 text-white flex items-center justify-center border-4 border-white"
                style={{ boxShadow: '0 4px 10px rgba(31,122,53,.4)' }}>
                <Icon size={26} />
              </span>
            </button>
          ) : (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] ${tab === key ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
              <Icon size={22} strokeWidth={tab === key ? 2.25 : 1.75} />
              {label}
            </button>
          )
        )}
      </nav>
    </div>
  )
}
