import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Fills the space between the app header and the bottom bar.
// Rendered straight into <body> so no parent can change what "fixed" means.
export default function FullMap({ children }) {
  const [box, setBox] = useState({ top: 56, bottom: 56 })

  useLayoutEffect(() => {
    const h = document.querySelector('header')
    const n = document.querySelector('nav')
    const measure = () => setBox({
      top: h ? Math.round(h.getBoundingClientRect().height) : 56,
      bottom: n ? Math.round(n.getBoundingClientRect().height) : 56,
    })
    measure()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('resize', measure)
    let ro = null
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(measure)
      if (h) ro.observe(h)
      if (n) ro.observe(n)
    }
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('resize', measure)
      if (ro) ro.disconnect()
    }
  }, [])

  return createPortal(
    <div style={{ position: 'fixed', left: 0, right: 0, top: box.top, bottom: box.bottom, zIndex: 900, background: '#F4F7F4' }}>
      {children}
    </div>,
    document.body
  )
}
