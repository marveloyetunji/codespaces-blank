import Illustration from './Illustration'

export default function SectionTabs({ view, setView, active, done, loaded = true }) {
  const count = view === 'active' ? active : done
  return (
    <div className="space-y-2">
      <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
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
        <div className="text-center py-8">
          <Illustration />
          <p className="font-semibold text-gray-800 mt-2">
            {view === 'active' ? 'Nothing open right now' : 'Nothing closed yet'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {view === 'active' ? 'New work will show up here.' : 'Finished items will be listed here.'}
          </p>
        </div>
      )}
    </div>
  )
}
