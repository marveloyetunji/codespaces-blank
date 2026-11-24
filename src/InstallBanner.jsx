import { useEffect, useState } from 'react'

let deferred = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e
  window.dispatchEvent(new Event('install-ready'))
})

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export default function InstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let gone = false
    try { gone = localStorage.getItem('installDismissed') === '1' } catch (e) {}
    if (gone || isStandalone()) return
    const check = () => setShow(!!deferred || isIos())
    check()
    window.addEventListener('install-ready', check)
    window.addEventListener('appinstalled', () => setShow(false))
    return () => window.removeEventListener('install-ready', check)
  }, [])

  if (!show) return null

  const dismiss = () => {
    try { localStorage.setItem('installDismissed', '1') } catch (e) {}
    setShow(false)
  }
  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    deferred = null
    setShow(false)
  }

  return (
    <div className="fixed inset-x-3 z-[1200] rounded-2xl p-3 text-white flex items-center gap-3 shadow-xl"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.75rem)',
        background: 'linear-gradient(135deg,#065f46,#10b981)',
      }}>
      <span className="text-3xl">♻️</span>
      <div className="flex-1 text-xs">
        <p className="font-bold text-sm">Install EcoTrack</p>
        <p className="opacity-90">
          {deferred ? 'Add it to your home screen for quick access.' : 'Tap Share, then Add to Home Screen.'}
        </p>
      </div>
      {deferred && (
        <button onClick={install} className="bg-white text-green-800 font-semibold text-sm px-3 py-2 rounded-xl">
          Install
        </button>
      )}
      <button onClick={dismiss} className="text-white/80 text-lg px-1">✕</button>
    </div>
  )
}
