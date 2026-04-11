import Spinner from './Spinner'

export default function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-karcha-bg gap-3">
      <Spinner size="lg" />
      <p className="text-karcha-muted text-sm">Loading…</p>
    </div>
  )
}
