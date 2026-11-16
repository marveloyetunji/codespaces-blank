import { useEffect, useState } from 'react'
import { Home, User, Truck, LayoutDashboard, Users as UsersIcon } from 'lucide-react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import ResetPassword from './ResetPassword'
import Toaster from './Toaster'
import InstallBanner from './InstallBanner'
import { Splash } from './Skeleton'
import Logo from './Logo'
import Citizen from './Citizen'
import Admin from './Admin'
import Collector from './Collector'
import Users from './Users'
import Profile from './Profile'

const HOME = { citizen: Citizen, collector: Collector, admin: Admin }
const TABS = {
  citizen: [['home', Home, 'Reports'], ['profile', User, 'Profile']],
  collector: [['home', Truck, 'Jobs'], ['profile', User, 'Profile']],
  admin: [['home', LayoutDashboard, 'Dashboard'], ['users', UsersIcon, 'Users'], ['profile', User, 'Profile']],
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [tab, setTab] = useState('home')

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
  if (!session) return <Auth />
  if (!profile) return <Splash />

  const role = HOME[profile.role] ? profile.role : 'citizen'
  const Screen = HOME[role]

  return (
    <div className="min-h-screen bg-green-50 pb-20">
      <header className="bg-green-700 text-white px-4 pb-3 flex items-center gap-3 sticky top-0 z-[1100]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <Logo size={30} />
        <div className="leading-tight">
          <p className="font-semibold">EcoTrack</p>
          <p className="text-xs text-white/70 capitalize">{profile.name || 'User'} · {role}</p>
        </div>
      </header>

      <Toaster role={role} />
      <InstallBanner />

      <main className="p-4">
        {tab === 'home' && <Screen />}
        {tab === 'users' && role === 'admin' && <Users />}
        {tab === 'profile' && <Profile profile={profile} email={session.user.email} onSaved={setProfile} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-[1100] bg-white border-t flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS[role].map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${tab === key ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
            <Icon size={22} strokeWidth={tab === key ? 2.25 : 1.75} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
