import { useEffect, useState, useCallback } from 'react'
import { CheckCheck, BellOff } from 'lucide-react'
import { supabase } from './supabaseClient'
import { Skeleton } from './Skeleton'

const ago = (t) => {
  const m = Math.floor((Date.now() - new Date(t)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + ' min ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' h ago'
  return new Date(t).toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

export default function Notifications({ userId }) {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications').select('*')
      .order('created_at', { ascending: false }).limit(50)
    if (error) setErr(error.message)
    else { setErr(''); setItems(data || []) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('notif-list-' + userId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, load])

  const markOne = async (id) => {
    setItems((l) => l.map((x) => (x.id === id ? { ...x, read: true } : x)))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) { setErr(error.message); load() }
  }

  const markAll = async () => {
    setItems((l) => l.map((x) => ({ ...x, read: true })))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
    if (error) { setErr(error.message); load() }
  }

  const unread = items.filter((x) => !x.read).length

  return (
    <div className="max-w-md mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-green-800">Notifications</h2>
        {unread > 0 && (
          <button onClick={markAll} className="text-sm text-green-700 font-medium flex items-center gap-1">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {!loaded && <Skeleton rows={3} />}

      {loaded && items.length === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <BellOff size={32} strokeWidth={1.5} className="mx-auto text-gray-400 mb-2" />
          <p className="font-semibold text-gray-800">No notifications yet</p>
          <p className="text-sm text-gray-500 mt-1">Updates on your reports and jobs will appear here.</p>
        </div>
      )}

      {items.map((x) => (
        <button key={x.id} onClick={() => !x.read && markOne(x.id)}
          className={`w-full text-left rounded-xl shadow p-3 flex gap-3 ${x.read ? 'bg-white' : 'bg-green-100'}`}>
          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${x.read ? 'bg-transparent' : 'bg-green-700'}`} />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{x.title}</p>
            {x.body && <p className="text-gray-600">{x.body}</p>}
            <p className="text-xs text-gray-400 mt-1">{ago(x.created_at)}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
