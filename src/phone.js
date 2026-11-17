export const COUNTRIES = [
  ['NG', '+234'], ['GH', '+233'], ['KE', '+254'], ['ZA', '+27'], ['CM', '+237'],
  ['BJ', '+229'], ['TG', '+228'], ['NE', '+227'], ['SN', '+221'], ['CI', '+225'],
  ['UG', '+256'], ['TZ', '+255'], ['EG', '+20'], ['GB', '+44'], ['US', '+1'],
  ['IE', '+353'], ['DE', '+49'], ['FR', '+33'], ['IN', '+91'],
  ['AE', '+971'], ['SA', '+966'], ['CN', '+86'],
]

// "+2348012345678" -> { dial: "+234", num: "8012345678" }
export function splitPhone(p) {
  if (!p) return { dial: '+234', num: '' }
  const dials = [...new Set(COUNTRIES.map((c) => c[1]))].sort((a, b) => b.length - a.length)
  const d = dials.find((x) => p.startsWith(x))
  return d ? { dial: d, num: p.slice(d.length) } : { dial: '+234', num: p.replace(/^\+/, '') }
}

// returns { value } (null = clear the number) or { error }
export function checkPhone(dial, raw) {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '')
  if (!digits) return { value: null }
  if (digits.length < 7 || digits.length > 12) return { error: 'Enter a valid phone number.' }
  if (dial === '+234' && digits.length !== 10) {
    return { error: 'Nigerian numbers have 10 digits after the 0, like 0801 234 5678.' }
  }
  return { value: dial + digits }
}
