import { useEffect, useRef, useState } from 'react'
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
import Bell from './Bell'
import Notifications from './Notifications'
import Intro from './Intro'
import NearbyMap from './NearbyMap'
import Schedule from './Schedule'

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
  const mainRef = useRef(null)
  const [intro, setIntro] = useState(() => {
    try { return sessionStorage.getItem('intro') !== '1' } catch (e) { return false }
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

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0)
  }, [tab])

  if (intro) {
    return <Intro quick={(() => { try { return localStorage.getItem('introSeen') === '1' } catch (e) { return false } })()}
      onDone={() => { try { sessionStorage.setItem('intro', '1'); localStorage.setItem('introSeen', '1') } catch (e) {} setIntro(false) }} />
  }
  if (recovering) return <ResetPassword onDone={() => setRecovering(false)} />
  if (!ready) return <Splash />
  if (!session) return <Auth />
  if (!profile) return <Splash />

  const role = TABS[profile.role] ? profile.role : 'citizen'

  return (
    <div className="app-shell">
      <header className="app-header">
        <Logo size={28} />
        <span className="font-display font-extrabold text-[17px] tracking-tight">EcoTrack</span>
        <span className="role-chip">{role}</span>
        <Bell userId={session.user.id} onOpen={() => setTab('alerts')} />
      </header>

      <Toaster role={role} />
      <InstallBanner />

      <main id="app-main" ref={mainRef} className="app-main">
        <div key={tab} className="screen-in">
          {role === 'citizen' && tab === 'home' && <Citizen view="home" go={setTab} name={profile.name} />}
          {role === 'citizen' && tab === 'history' && <Citizen view="history" go={setTab} />}
          {role === 'citizen' && tab === 'schedule' && <Schedule />}
          {role === 'citizen' && tab === 'nearby' && <NearbyMap />}
          {role === 'citizen' && tab === 'report' && (
            <ReportForm onDone={() => setTab('history')} onBack={() => setTab('home')} />
          )}
          {role === 'collector' && tab === 'home' && <Collector name={profile.name} />}
          {role === 'admin' && tab === 'home' && <Admin />}
          {role === 'admin' && tab === 'users' && <Users />}
          {tab === 'alerts' && <Notifications userId={session.user.id} />}
          {tab === 'profile' && <Profile profile={profile} email={session.user.email} onSaved={setProfile} />}
        </div>
      </main>

      <nav className="app-nav" aria-label="Main">
        {TABS[role].map(([key, Icon, label, center]) =>
          center ? (
            <button key={key} type="button" onClick={() => setTab(key)} aria-label="Report waste" className="nav-fab-wrap">
              <span className="nav-fab"><Icon size={26} /></span>
              <span className="nav-fab-label">{label}</span>
            </button>
          ) : (
            <button key={key} type="button" onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined} className={`nav-item ${tab === key ? 'on' : ''}`}>
              <span className="nav-pill"><Icon size={22} strokeWidth={tab === key ? 2.25 : 1.75} /></span>
              {label}
            </button>
          )
        )}
      </nav>
    </div>
  )
}
