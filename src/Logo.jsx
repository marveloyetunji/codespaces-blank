export default function Logo({ size = 28, dark = false }) {
  const bg = dark ? '#2E9B47' : '#FFFFFF'
  const fg = dark ? '#FFFFFF' : '#2E9B47'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="EcoTrack">
      <rect width="32" height="32" rx="8" fill={bg} />
      <path d="M16 5.5c-4.7 0-8.5 3.6-8.5 8.2 0 5.6 8.5 12.8 8.5 12.8s8.5-7.2 8.5-12.8c0-4.6-3.8-8.2-8.5-8.2z" fill={fg} />
      <path d="M12 15c0-2.8 2.2-4 5-4 0 3.1-1.3 5.2-4 5.5z" fill={bg} />
    </svg>
  )
}
