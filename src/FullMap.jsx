import { useLayoutEffect } from 'react'

// A map screen fills exactly the content area between the header and the bottom bar.
export default function FullMap({ children }) {
  useLayoutEffect(() => {
    const main = document.getElementById('app-main')
    if (main) { main.scrollTo(0, 0); main.setAttribute('data-bleed', '1') }
    return () => { if (main) main.removeAttribute('data-bleed') }
  }, [])
  return (
    <div className="map-screen">
      <h1 className="sr-only">Map</h1>
      {children}
    </div>
  )
}
