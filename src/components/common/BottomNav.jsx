import { NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/dashboard',  emoji: '🏠', label: 'Home'     },
  { to: '/expenses',   emoji: '📋', label: 'Expenses' },
  { to: '/add',        emoji: '＋', label: 'Add',     fab: true },
  { to: '/analytics',  emoji: '📊', label: 'Analysis' },
  { to: '/settings',   emoji: '⚙️', label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-karcha-border shadow-nav z-50 flex justify-around items-center px-2 pb-safe">
      {NAV.map(({ to, emoji, label, fab }) => (
        fab ? (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center -mt-5"
          >
            {({ isActive }) => (
              <span className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg transition-colors ${
                isActive ? 'bg-accent-500 text-white' : 'bg-primary-600 text-white'
              }`}>
                ＋
              </span>
            )}
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center py-3 px-3 min-w-0 flex-1"
          >
            {({ isActive }) => (
              <>
                <span className="text-xl">{emoji}</span>
                <span className={`text-[10px] mt-0.5 font-medium transition-colors ${
                  isActive ? 'text-primary-600' : 'text-karcha-muted'
                }`}>
                  {label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary-600 mt-1" />
                )}
              </>
            )}
          </NavLink>
        )
      ))}
    </nav>
  )
}
