import Spinner from './Spinner'

export default function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-karcha-bg gap-3">
      <div className="w-16 h-16 bg-primary-50 rounded-3xl flex items-center justify-center">
        <span className="text-3xl">💸</span>
      </div>
      <Spinner size="lg" />
      <p className="text-karcha-muted text-sm">Loading…</p>
    </div>
  )
}
