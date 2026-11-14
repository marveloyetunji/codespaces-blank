import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Collector from './Collector'
import Admin from './Admin'
import Citizen from './Citizen'


export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
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
      <main className="p-4">
        <Screen />
      </main>
    </div>
  )
}
