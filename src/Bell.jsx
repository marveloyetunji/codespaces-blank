import { useEffect, useState, useCallback } from 'react'
import { Bell as BellIcon } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function Bell({ userId, onOpen }) {
  const [n, setN] = useState(0)

  const load = useCallback(async () => {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
    setN(count || 0)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('bell-' + userId)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, load])

  return (
    <button onClick={onOpen} aria-label={n > 0 ? `Notifications, ${n} unread` : 'Notifications'} className="ml-auto relative p-2">
      <BellIcon size={22} />
      {n > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sun text-forest text-[11px] font-bold flex items-center justify-center">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </button>
  )
}
