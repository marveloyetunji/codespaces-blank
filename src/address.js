const cache = new Map()
let last = 0
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const uniq = (a) => a.filter((p, i) => p && a.indexOf(p) === i)

async function fromNominatim(lat, lng) {
  const gap = Date.now() - last
  if (gap < 1100) await wait(1100 - gap)
  last = Date.now()
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${lat}&lon=${lng}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('geocoder')
  const a = (await res.json()).address || {}
  const street = a.road || a.pedestrian || a.footway || a.path
  const area = a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.city_district
  const town = a.city || a.town || a.village || a.municipality || a.county
  const text = uniq([street, area, town, a.state]).join(', ')
  if (!text) throw new Error('empty')
  return { text, precise: !!(street || area) }
}

async function fromBigDataCloud(lat, lng) {
  const key = import.meta.env.VITE_BIGDATACLOUD_KEY
  const url = key
    ? `https://api-bdc.net/data/reverse-geocode?latitude=${lat}&longitude=${lng}&localityLanguage=en&key=${key}`
    : `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  const d = await (await fetch(url)).json()
  const text = uniq([d.locality, d.city, d.principalSubdivision]).join(', ')
  if (!text) throw new Error('empty')
  return { text, precise: false }
}

export async function getAddress(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (cache.has(key)) return cache.get(key)
  let out
  try { out = await fromNominatim(lat, lng) }
  catch {
    try { out = await fromBigDataCloud(lat, lng) }
    catch { out = { text: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, precise: false } }
  }
  cache.set(key, out)
  return out
}

export function geoMessage(code) {
  if (code === 1) return 'Location is blocked for EcoTrack. Tap the lock icon next to the web address, open Permissions, set Location to Allow, then try again.'
  if (code === 2) return 'Your phone location is switched off. Swipe down from the top of the screen, turn on Location, then try again.'
  return 'Could not get a position in time. Move to an open area and try again.'
}
