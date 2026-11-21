import L from 'leaflet'

// Paste a free CARTO key here (carto.com/basemaps/apikey), or set VITE_CARTO_KEY in Vercel.
const KEY = import.meta.env.VITE_CARTO_KEY || 'cb1_5ddt_1_b14e39e2aa3e571f69ae1b54'
const HAS_KEY = KEY && KEY !== 'PASTE_KEY_HERE'

export const TILE_URL = HAS_KEY
  ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export const TILE_ATTR = HAS_KEY
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>'
  : '&copy; OpenStreetMap'

export const TILE_NATIVE = HAS_KEY ? 18 : 19

const cache = {}
export const pinIcon = (color = '#2E9B47') =>
  cache[color] ||
  (cache[color] = L.divIcon({
    className: '',
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"><path d="M15 1C7.3 1 1 7.2 1 14.8 1 25 15 39 15 39s14-14 14-24.2C29 7.2 22.7 1 15 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14.5" r="5" fill="#fff"/></svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 39],
    popupAnchor: [0, -34],
  }))

export const youIcon = L.divIcon({
  className: '',
  html: '<div class="you-dot"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})
