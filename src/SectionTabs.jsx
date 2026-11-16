export default function SectionTabs({ view, setView, active, done, loaded = true }) {
  const count = view === 'active' ? active : done
  return (
    <div className="space-y-2">
      <div className="flex bg-white rounded-xl shadow p-1 gap-1">
        {[['active', 'Open', active], ['done', 'Closed', done]].map(([key, label, n]) => (
          <button key={key} type="button" onClick={() => setView(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              view === key ? 'bg-green-700 text-white' : 'text-gray-500'
            }`}>
            {label} ({n})
          </button>
        ))}
      </div>
      {loaded && count === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          {view === 'active' ? 'Nothing open right now.' : 'No closed reports yet.'}
        </p>
      )}
    </div>
  )
}
