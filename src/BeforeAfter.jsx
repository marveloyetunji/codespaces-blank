export default function BeforeAfter({ r }) {
  if (!r.proof_url) return null
  return (
    <div className="grid grid-cols-2 gap-2">
      {[['Reported', r.photo_url], ['Collected', r.proof_url]].map(([label, src]) => (
        <div key={label} className="relative h-32 rounded-lg overflow-hidden bg-gray-100">
          {src
            ? <img src={src} alt={label} className="w-full h-full object-cover" />
            : <div className="h-full flex items-center justify-center text-xs text-gray-400">No photo</div>}
          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">{label}</span>
        </div>
      ))}
    </div>
  )
}
