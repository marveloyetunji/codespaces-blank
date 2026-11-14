export function confetti() {
  const c = document.createElement('canvas')
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3000'
  c.width = window.innerWidth
  c.height = window.innerHeight
  document.body.appendChild(c)
  const g = c.getContext('2d')
  const colors = ['#10b981', '#34d399', '#fbbf24', '#f97316', '#3b82f6', '#ec4899']
  const ps = Array.from({ length: 120 }, () => ({
    x: Math.random() * c.width,
    y: -20 - Math.random() * c.height * 0.5,
    r: 4 + Math.random() * 5,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * 6,
    col: colors[Math.floor(Math.random() * colors.length)],
  }))
  let t = 0
  const tick = () => {
    g.clearRect(0, 0, c.width, c.height)
    ps.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += 0.1
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot)
      g.fillStyle = p.col; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
      g.restore()
    })
    if (++t < 180) requestAnimationFrame(tick)
    else c.remove()
  }
  tick()
  if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 160])
}
