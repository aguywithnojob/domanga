import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useExpenses } from '../contexts/ExpenseContext'
import { formatINR, thisMonthRange, formatDate } from '../utils/formatUtils'
import { getCategoryMeta } from '../utils/categories'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import Spinner from '../components/common/Spinner'
import BottomNav from '../components/common/BottomNav'

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const { expenses, loading } = useExpenses()

  const { from, to } = thisMonthRange()

  const monthExpenses = useMemo(() =>
    expenses.filter(e =>
      isWithinInterval(new Date(e.date), { start: startOfDay(from), end: endOfDay(to) })
    ),
    [expenses, from, to]
  )

  const totalMonth   = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const mySpend      = monthExpenses.filter(e => e.paidBy === userProfile?.id).reduce((s, e) => s + e.amount, 0)
  const partnerSpend = totalMonth - mySpend
  const recent       = expenses.slice(0, 5)

  return (
    <div className="min-h-screen bg-karcha-bg pb-24">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-5 pt-12 pb-8">
        <p className="text-white/70 text-sm font-medium">Hey {userProfile?.displayName} 👋</p>
        <h1 className="text-white text-2xl font-extrabold mt-0.5">This Month</h1>
        <div className="mt-5 bg-white/15 backdrop-blur-sm rounded-3xl p-5">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Total Spent</p>
          <p className="text-white text-4xl font-extrabold">{formatINR(totalMonth)}</p>
          <div className="h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-accent-400 rounded-full transition-all duration-700"
              style={{ width: totalMonth > 0 ? `${Math.min((mySpend / totalMonth) * 100, 100)}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <div>
              <p className="text-white/60 text-xs">You</p>
              <p className="text-white font-bold text-sm">{formatINR(mySpend)}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Partner</p>
              <p className="text-white font-bold text-sm">{formatINR(partnerSpend)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link to="/add" className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-card active:scale-95 transition-transform">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-xl">➕</div>
            <span className="font-semibold text-karcha-text text-sm">Add Expense</span>
          </Link>
          <Link to="/analytics" className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-card active:scale-95 transition-transform">
            <div className="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center text-xl">📊</div>
            <span className="font-semibold text-karcha-text text-sm">Analytics</span>
          </Link>
        </div>

        {/* Recent Expenses */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-karcha-text">Recent Expenses</h2>
          <Link to="/expenses" className="text-primary-600 text-sm font-semibold">See all</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : recent.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-card">
            <p className="text-4xl mb-3">🪙</p>
            <p className="font-semibold text-karcha-text">No expenses yet</p>
            <p className="text-karcha-muted text-sm mt-1">Tap "Add Expense" to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(exp => {
              const meta = getCategoryMeta(exp.category)
              const isMe = exp.paidBy === userProfile?.id
              return (
                <div key={exp.id} className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card">
                  <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-karcha-text text-sm truncate">
                      {exp.description || meta.label}
                    </p>
                    <p className="text-karcha-muted text-xs mt-0.5">
                      {formatDate(exp.date)} · {isMe ? 'You' : 'Partner'}
                    </p>
                  </div>
                  <p className="font-bold text-karcha-text text-sm flex-shrink-0">{formatINR(exp.amount)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
