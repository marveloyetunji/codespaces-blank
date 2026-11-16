export default function Logo({ size = 28, dark = false }) {
  const bg = dark ? '#075C43' : '#FFFFFF'
  const fg = dark ? '#FFFFFF' : '#075C43'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="EcoTrack">
      <rect width="32" height="32" rx="7" fill={bg} />
      <path d="M16 5.5c-4.7 0-8.500 3.600-8.500 8.200 0 5.600 8.500 12.800 8.500 12.800s8.500-7.200 8.500-12.800c0-4.600-3.800-8.200-8.500-8.200z" fill={fg} />
      <path d="M12 15c0-2.800 2.200-4 5-4 0 3.100-1.300 5.200-4 5.500z" fill={bg} />
    </svg>
  )
}
