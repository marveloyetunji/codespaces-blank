import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import ResetPassword from './ResetPassword'
import Toaster from './Toaster'
import Collector from './Collector'
import Admin from './Admin'
import Citizen from './Citizen'


export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)

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
    if (!session) return setProfile(null)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [session])

  if (recovering) return <ResetPassword onDone={() => setRecovering(false)} />
  if (!ready) return <div className="p-6 text-center">Loading...</div>
  if (!session) return <Auth />
  if (!profile) return <div className="p-6 text-center">Loading profile...</div>

  const Screen = { admin: Admin, collector: Collector }[profile.role] || Citizen

  return (
    <div className="min-h-screen bg-green-50">
      <header className="bg-green-700 text-white p-4 flex justify-between items-center">
        <div>
          <p className="font-bold">EcoTrack</p>
          <p className="text-xs opacity-80">{profile.name} · {profile.role}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm bg-white/20 px-3 py-1 rounded"
        >
          Logout
        </button>
      </header>
      <Toaster role={profile.role} />
      <main className="p-4">
        <Screen />
      </main>
    </div>
  )
}
