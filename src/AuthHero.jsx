import Logo from './Logo'

export default function AuthHero({ title, text, compact = false }) {
  return (
    <div className="bg-forest text-white relative overflow-hidden"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
      <div className="px-6 flex items-center gap-2">
        <Logo size={30} />
        <span className="font-display font-bold text-lg tracking-tight">EcoTrack</span>
      </div>

      <div className="px-6 mt-5 pb-3 relative z-10">
        <h1 className="font-display text-[28px] leading-tight font-extrabold">{title}</h1>
        {text && <p className="mt-2 text-sm text-white/75 max-w-xs">{text}</p>}
      </div>

      <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice"
        className={`w-full block ${compact ? 'h-24' : 'h-36'}`} aria-hidden="true">
        <circle cx="338" cy="36" r="34" fill="#F5B335" opacity=".14" />
        <circle cx="338" cy="36" r="20" fill="#F5B335" />
        <g fill="#14543F">
          <rect x="12" y="74" width="30" height="80" rx="3" />
          <rect x="46" y="52" width="26" height="102" rx="3" />
          <rect x="76" y="84" width="32" height="70" rx="3" />
          <rect x="292" y="66" width="28" height="88" rx="3" />
          <rect x="324" y="86" width="32" height="68" rx="3" />
          <rect x="360" y="58" width="28" height="96" rx="3" />
        </g>
        <path d="M0 150V114C56 98 118 120 200 110 282 100 342 118 400 106V150Z" fill="#0F4A37" />
        <path d="M70 134C110 124 130 134 176 120S246 104 262 98" fill="none" stroke="#fff"
          strokeOpacity=".75" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
        <rect x="36" y="110" width="24" height="32" rx="4" fill="#2E9B47" />
        <rect x="33" y="104" width="30" height="7" rx="3.5" fill="#3DAE57" />
        <path d="M42 116v20M48 116v20M54 116v20" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="262" cy="100" rx="9" ry="2.6" fill="#000" opacity=".25" />
        <g transform="translate(240 64) scale(1.35)">
          <path d="M16 5.5c-4.7 0-8.5 3.6-8.5 8.2 0 5.6 8.5 12.8 8.5 12.8s8.5-7.2 8.5-12.8c0-4.6-3.8-8.2-8.5-8.2z" fill="#fff" />
          <path d="M12 15c0-2.8 2.2-4 5-4 0 3.1-1.3 5.2-4 5.5z" fill="#2E9B47" />
        </g>
      </svg>
    </div>
  )
}
