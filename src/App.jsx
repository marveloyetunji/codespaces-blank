import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import InstallBanner from './InstallBanner'
import Auth from './Auth'
import ResetPassword from './ResetPassword'
import Toaster from './Toaster'
import { Splash } from './Skeleton'
import Citizen from './Citizen'
import Admin from './Admin'
import Collector from './Collector'
import Users from './Users'
import Profile from './Profile'

const HOME = { citizen: Citizen, collector: Collector, admin: Admin }
const TABS = {
  citizen: [['home', '🏠', 'Home'], ['profile', '👤', 'Profile']],
  collector: [['home', '🚛', 'Jobs'], ['profile', '👤', 'Profile']],
  admin: [['home', '📊', 'Dashboard'], ['users', '👥', 'Users'], ['profile', '👤', 'Profile']],
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [tab, setTab] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); setTab('home'); return }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session])

  if (recovering) return <ResetPassword onDone={() => setRecovering(false)} />
  if (!ready) return <Splash />
  if (!session) return <Auth />
  if (!profile) return <Splash />

  const role = HOME[profile.role] ? profile.role : 'citizen'
  const Home = HOME[role]
  const tabs = TABS[role]

  return (
    <div className="min-h-screen bg-green-50 pb-24">
      <header className="bg-green-700 text-white p-4 flex justify-between items-center">
        <div>
          <p className="font-bold">EcoTrack</p>
          <p className="text-xs opacity-80">{profile.name} · {role}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm bg-white/20 px-3 py-1 rounded"
        >
          Logout
        </button>
      </header>

      <Toaster role={role} />
      <InstallBanner />

      <main className="p-4">
        {tab === 'home' && <Home />}
        {tab === 'users' && role === 'admin' && <Users />}
        {tab === 'profile' && (
          <Profile profile={profile} email={session.user.email} onSaved={setProfile} />
        )}
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-[1100] bg-white border-t flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', boxShadow: '0 -4px 18px rgba(6,95,70,.1)' }}
      >
        {tabs.map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center py-2 text-xs ${
              tab === key ? 'text-green-700 font-semibold' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
