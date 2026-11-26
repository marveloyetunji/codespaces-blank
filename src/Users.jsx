import { useEffect, useState, useCallback } from 'react'
import { Phone, Search } from 'lucide-react'
import { supabase } from './supabaseClient'
import { Skeleton } from './Skeleton'
import Avatar from './Avatar'

export default function Users() {
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles')
      .select('id,name,role,phone,avatar_url,created_at').order('created_at', { ascending: false })
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
      <h1 className="text-[22px] font-extrabold text-ink">Users</h1>

      <div className="bg-white border border-line rounded-2xl grid grid-cols-3 divide-x divide-line text-center">
        {[['citizen', 'Residents'], ['collector', 'Collectors'], ['admin', 'Admins']].map(([r, label]) => (
          <div key={r} className="py-3">
            <p className="font-display text-xl font-extrabold text-ink">{count(r)}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input className="field !pl-11" aria-label="Search users" placeholder="Search by name or phone"
          value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-muted">
        Change a role here. The person must log out and back in to see their new screens.
        {noPhone > 0 && ` ${noPhone} of ${users.length} users have not added a phone number.`}
      </p>

      {err && (
        <div role="alert" className="bg-red-50 text-red-800 rounded-xl px-3 py-2.5 text-sm flex items-center justify-between gap-3">
          <span>{err}</span>
          <button type="button" onClick={load} className="font-semibold underline shrink-0">Try again</button>
        </div>
      )}
      {!loaded && <Skeleton rows={3} />}

      <div className="space-y-2">
        {shown.map((u) => (
          <div key={u.id} className="bg-white border border-line rounded-2xl p-3 flex items-center gap-3">
            <Avatar name={u.name} url={u.avatar_url} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate text-ink">{u.name || 'No name'}{u.id === me && ' (you)'}</p>
              {u.phone
                ? <a href={`tel:${u.phone}`} className="text-xs text-green-800 flex items-center gap-1"><Phone size={12} /> {u.phone}</a>
                : <p className="text-xs text-amber-800">No phone</p>}
              <p className="text-xs text-muted">
                Joined {new Date(u.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <select className="field !w-auto !py-2 !px-2 text-sm" aria-label={`Role for ${u.name || 'user'}`}
              value={u.role} disabled={u.id === me} onChange={(e) => setRole(u.id, e.target.value)}>
              <option value="citizen">citizen</option>
              <option value="collector">collector</option>
              <option value="admin">admin</option>
            </select>
          </div>
        ))}
        {loaded && shown.length === 0 && <p className="text-sm text-muted">No users found.</p>}
      </div>
    </div>
  )
}
