import { useNavigate } from 'react-router-dom'

export default function Header({ title, backTo, action }) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center justify-between px-5 pt-12 pb-4 bg-white sticky top-0 z-40 border-b border-karcha-border/50">
      <div className="flex items-center gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-karcha-text"
          >
            ←
          </button>
        )}
        <h1 className="text-lg font-bold text-karcha-text">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </header>
  )
}
