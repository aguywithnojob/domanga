export default function Spinner({ size = 'md', className = '' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-10 h-10 border-4' : 'w-6 h-6 border-2'
  return (
    <span className={`inline-block rounded-full border-primary-200 border-t-primary-600 animate-spin ${s} ${className}`} />
  )
}
