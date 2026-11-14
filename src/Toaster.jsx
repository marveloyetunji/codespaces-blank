import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const TEXT = {
  citizen: {
    assigned: 'Your report has been assigned to a collector 🚛',
    in_progress: 'A collector is on the way to your report 🧭',
    collected: 'Your report has been collected ✅',
  },
  collector: { assigned: 'New job assigned to you 📌' },
  admin: {
    insert: 'New waste report submitted 🗑️',
    in_progress: 'A collector started a job 🧭',
    collected: 'A job was collected ✅',
  },
}

export default function Toaster({ role }) {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const push = (text) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, text }])
      if (navigator.vibrate) navigator.vibrate(100)
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
    }

    const ch = supabase
      .channel('toasts-' + role)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (p) => {
        const map = TEXT[role] || {}
        if (p.eventType === 'INSERT') {
          if (map.insert) push(map.insert)
        } else if (p.eventType === 'UPDATE') {
          if (p.old && p.old.status === p.new.status) return
          const msg = map[p.new.status]
          if (msg) push(msg)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [role])

  return (
    <div className="fixed top-2 inset-x-0 z-[2000] flex flex-col items-center gap-2 px-3 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className="bg-green-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-sm w-full">
          {t.text}
        </div>
      ))}
    </div>
  )
}
