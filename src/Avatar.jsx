export default function Avatar({ name, url, size = 40, className = '' }) {
  const letter = ((name || '?').trim()[0] || '?').toUpperCase()
  const s = { width: size, height: size, fontSize: Math.round(size * 0.42) }
  return url
    ? <img src={url} alt="" style={s} className={`rounded-full object-cover shrink-0 ${className}`} />
    : <span style={s} className={`rounded-full bg-green-700 text-white font-display font-extrabold flex items-center justify-center shrink-0 ${className}`}>{letter}</span>
}
