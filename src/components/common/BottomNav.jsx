import { NavLink } from 'react-router-dom'

function NavItem({ to, emoji, label }) {
  return (
    <NavLink to={to} className="flex flex-col items-center py-3 px-2 min-w-0 flex-1">
      {({ isActive }) => (
        <>
          <span className="text-xl">{emoji}</span>
          <span className={`text-[10px] mt-0.5 font-medium transition-colors ${
            isActive ? 'text-primary-600' : 'text-karcha-muted'
          }`}>
            {label}
          </span>
          {isActive && <span className="w-1 h-1 rounded-full bg-primary-600 mt-1" />}
        </>
      )}
    </NavLink>
  )
}

function FabItem({ to, emoji }) {
  return (
    <NavLink to={to} className="flex flex-col items-center -mt-5 px-2">
      {({ isActive }) => (
        <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg transition-colors ${
          isActive ? 'bg-accent-500 text-white' : 'bg-primary-600 text-white'
        }`}>
          {emoji}
        </span>
      )}
    </NavLink>
  )
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-karcha-border shadow-nav z-50 flex justify-around items-center px-2 pb-safe">
      <NavItem to="/dashboard" emoji="🏠" label="Home" />
      <NavItem to="/expenses"  emoji="📋" label="Expenses" />
      <FabItem to="/add" emoji="＋" />
      <NavItem to="/analytics" emoji="✨" label="Insights" />
      <NavItem to="/settings"  emoji="⚙️" label="Settings" />
    </nav>
  )
}
