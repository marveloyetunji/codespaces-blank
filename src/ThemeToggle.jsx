import { useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'))

  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch (e) {}
    setDark(next)
  }

  return (
    <button onClick={toggle}
      className="w-full bg-white border rounded-xl p-3 font-semibold text-green-800 flex items-center justify-center gap-2">
      {dark ? '☀️ Switch to light mode' : '🌙 Switch to dark mode'}
    </button>
  )
}
