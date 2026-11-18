import { useEffect, useState, useCallback } from 'react'
import { Phone } from 'lucide-react'
import { supabase } from './supabaseClient'
import { Skeleton } from './Skeleton'

export default function Users() {
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles')
      .select('id,name,role,phone,created_at').order('created_at', { ascending: false })
    if (error) setErr(error.message); else { setErr(''); setUsers(data || []) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id))
  }, [load])

  const setRole = async (id, role) => {
    setErr('')
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) setErr(error.message)
    load()
  }

  const term = q.trim().toLowerCase()
  const shown = users.filter((u) =>
    !term || (u.name || '').toLowerCase().includes(term) || (u.phone || '').includes(term.replace(/\s/g, ''))
  )
  const count = (r) => users.filter((u) => u.role === r).length
  const noPhone = users.filter((u) => !u.phone).length

  return (
    <div className="max-w-md lg:max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Users</h1>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[['citizen', 'Residents'], ['collector', 'Collectors'], ['admin', 'Admins']].map(([r, label]) => (
          <div key={r} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xl font-bold text-gray-900">{count(r)}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <input className="field" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="text-xs text-gray-500">
        Change a role here. The person must log out and back in to see their new screens.
        {noPhone > 0 && ` ${noPhone} of ${users.length} users have not added a phone number yet.`}
      </p>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {!loaded && <Skeleton rows={3} />}

      <div className="space-y-2">
        {shown.map((u) => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{u.name || 'No name'}{u.id === me && ' (you)'}</p>
              {u.phone
                ? <a href={`tel:${u.phone}`} className="text-xs text-green-700 flex items-center gap-1">
                    <Phone size={12} /> {u.phone}
                  </a>
                : <p className="text-xs text-amber-700">No phone</p>}
              <p className="text-xs text-gray-500">
                Joined {new Date(u.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <select className="field !w-auto !p-2 text-sm" value={u.role} disabled={u.id === me}
              onChange={(e) => setRole(u.id, e.target.value)}>
              <option value="citizen">citizen</option>
              <option value="collector">collector</option>
              <option value="admin">admin</option>
            </select>
          </div>
        ))}
        {loaded && shown.length === 0 && <p className="text-sm text-gray-500">No users found.</p>}
      </div>
    </div>
  )
}
