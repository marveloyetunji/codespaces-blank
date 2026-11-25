import { Component } from 'react'
import Logo from './Logo'

export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error('EcoTrack error:', err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-[100dvh] bg-forest text-white flex flex-col items-center justify-center px-8 text-center">
        <Logo size={56} />
        <h1 className="font-display text-2xl font-extrabold mt-5">Something went wrong</h1>
        <p className="text-sm text-white/75 mt-2 max-w-xs">The app hit an unexpected problem. Your reports are safe. Reload to continue.</p>
        <button type="button" onClick={() => window.location.reload()} className="btn mt-6 bg-white text-forest px-8">Reload</button>
      </div>
    )
  }
}
