import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabaseClient'

export default function Users({ onChange }) {
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,name,role')
      .order('created_at', { ascending: false })
    setUsers(data || [])
  }, [])

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id))
  }, [load])

  const setRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    await load()
    onChange && onChange()
  }

  return (
    <div className="bg-white p-3 rounded-xl shadow space-y-2">
      <h2 className="font-bold text-green-800">Manage users</h2>
      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">{u.name || 'No name'}</span>
          <select
            className="border rounded-lg p-2"
            value={u.role}
            disabled={u.id === me}
            onChange={(e) => setRole(u.id, e.target.value)}
          >
            <option value="citizen">citizen</option>
            <option value="collector">collector</option>
            <option value="admin">admin</option>
          </select>
        </div>
      ))}
    </div>
  )
}
