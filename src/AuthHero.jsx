import Logo from './Logo'

// Contour lines fade out before the text; the sonar sits on the ground under the pin tip.
const BLOB = 'M40 -107C94 -89 124 -17 96 43C68 103 -14 127 -76 97C-138 67 -140 -1 -102 -43C-64 -85 -14 -125 40 -107Z'
const RINGS = [[1.05, 0], [0.86, 7], [0.68, -5], [0.5, 9], [0.34, -7]]
const CX = 332
const CY = 168
const FADE = 'linear-gradient(to right, transparent 28%, #000 64%)'

export default function AuthHero() {
  return (
    <div className="bg-forest text-white relative overflow-hidden"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}>
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMaxYMid slice"
        className="absolute inset-0 w-full h-full"
        style={{ WebkitMaskImage: FADE, maskImage: FADE }} aria-hidden="true">
        {RINGS.map(([s, r], i) => (
          <path key={i} d={BLOB} fill="none" stroke="#fff" strokeOpacity={0.07 + i * 0.012} strokeWidth="1.3"
            transform={`translate(${CX} ${CY}) rotate(${r}) scale(${s})`} />
        ))}
        <ellipse className="ripple" cx={CX} cy={CY} rx="12" ry="3.6" fill="none" stroke="#4ADE80" strokeWidth="1.6" />
        <ellipse className="ripple r2" cx={CX} cy={CY} rx="12" ry="3.6" fill="none" stroke="#4ADE80" strokeWidth="1.6" />
        <ellipse cx={CX} cy={CY} rx="5" ry="1.8" fill="#4ADE80" />
        <g transform={`translate(${CX - 24} ${CY - 40}) scale(1.5)`}>
          <path d="M16 5.5c-4.7 0-8.5 3.6-8.5 8.2 0 5.6 8.5 12.8 8.5 12.8s8.5-7.2 8.5-12.8c0-4.6-3.8-8.2-8.5-8.2z" fill="#fff" />
          <path d="M12 15c0-2.8 2.2-4 5-4 0 3.1-1.3 5.2-4 5.5z" fill="#118542" />
        </g>
      </svg>

      <div className="relative px-6 pb-12">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <span className="font-display font-extrabold text-lg tracking-tight">EcoTrack</span>
        </div>
        <h1 className="font-display text-[25px] leading-[1.15] font-extrabold mt-5">
          Report waste.<br />Watch it cleared.
        </h1>
      </div>
    </div>
  )
}
