import { useMemo, useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useExpenses } from '../contexts/ExpenseContext'
import { formatINR, thisMonthRange, formatDate } from '../utils/formatUtils'
import { getCategoryMeta } from '../utils/categories'
import { isWithinInterval, startOfDay, endOfDay, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import Spinner from '../components/common/Spinner'
import BottomNav from '../components/common/BottomNav'

function Sparkline({ weeks }) {
  const max = Math.max(...weeks.map(w => w.total), 1)
  const W = 56, H = 26, pad = 4
  const pts = weeks.map((w, i) => {
    const x = pad + (i / (weeks.length - 1)) * (W - pad * 2)
    const y = H - pad - (w.total / max) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const up = weeks[weeks.length - 1]?.total >= weeks[0]?.total
  const color = up ? '#ef4444' : '#16a34a'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}

export default function DashboardPage() {
  const { userProfile, partnerProfile } = useAuth()
  const { expenses, budget, loading } = useExpenses()
  const partnerName = partnerProfile?.displayName || 'Partner'
  const [tab, setTab] = useState('all')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [newExpenseIds, setNewExpenseIds] = useState(new Set())
  const prevIdsRef = useRef(null)

  // Track newly-arrived expenses to flash them
  useEffect(() => {
    if (prevIdsRef.current === null) {
      prevIdsRef.current = new Set(expenses.map(e => e.id))
      return
    }
    const prevIds = prevIdsRef.current
    const incoming = expenses.filter(e => !prevIds.has(e.id)).map(e => e.id)
    prevIdsRef.current = new Set(expenses.map(e => e.id))
    if (incoming.length === 0) return
    setNewExpenseIds(prev => new Set([...prev, ...incoming]))
    const timer = setTimeout(() => {
      setNewExpenseIds(prev => {
        const next = new Set(prev)
        incoming.forEach(id => next.delete(id))
        return next
      })
    }, 2000)
    return () => clearTimeout(timer)
  }, [expenses])

  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  const { from, to } = thisMonthRange()
  const today = new Date()

  const monthExpenses = useMemo(() =>
    expenses.filter(e =>
      isWithinInterval(new Date(e.date), { start: startOfDay(from), end: endOfDay(to) })
    ), [expenses, from, to])

  const totalMonth   = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const mySpend      = monthExpenses.filter(e => e.paidBy === userProfile?.id).reduce((s, e) => s + e.amount, 0)
  const partnerSpend = totalMonth - mySpend

  const budgetPct  = budget ? Math.min((totalMonth / budget) * 100, 100) : null
  const budgetOver = budget && totalMonth > budget
  const budgetLeft = budget ? Math.max(budget - totalMonth, 0) : null

  const daysPassed = today.getDate()
  const dailyAvg   = daysPassed > 0 ? Math.round(totalMonth / daysPassed) : 0

  const todayTotal = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.date)
      return d.getFullYear() === today.getFullYear() &&
             d.getMonth()    === today.getMonth()    &&
             d.getDate()     === today.getDate()
    }).reduce((s, e) => s + e.amount, 0)
  , [expenses])

  const weekData = useMemo(() => {
    function sumWeek(s, e) {
      return expenses
        .filter(exp => isWithinInterval(new Date(exp.date), { start: startOfDay(s), end: endOfDay(e) }))
        .reduce((a, exp) => a + exp.amount, 0)
    }
    const prevStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
    const prevEnd   = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
    const thisStart = startOfWeek(today, { weekStartsOn: 1 })
    const thisEnd   = endOfWeek(today, { weekStartsOn: 1 })
    return [
      { label: 'Last', total: sumWeek(prevStart, prevEnd) },
      { label: 'This', total: sumWeek(thisStart, thisEnd) },
    ]
  }, [expenses])

  const recentAll     = expenses.slice(0, 6)
  const recentMe      = expenses.filter(e => e.paidBy === userProfile?.id).slice(0, 6)
  const recentPartner = expenses.filter(e => e.paidBy !== userProfile?.id).slice(0, 6)
  const recent = tab === 'all' ? recentAll : tab === 'me' ? recentMe : recentPartner

  return (
    <div className="min-h-screen bg-karcha-bg pb-24">
      {/* Header */}
      <div className={`relative overflow-hidden px-5 pt-12 pb-6 ${isOnline ? 'bg-primary-600' : 'bg-gray-500'}`}>
        {!isOnline && (
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10" width="120" height="120" viewBox="0 0 24 24" fill="white">
            <path d="M2.28 3L1 4.27l2.1 2.1A11.95 11.95 0 0 0 1.2 8.55l1.8 1.35A9.93 9.93 0 0 1 5.17 7.6l1.47 1.47A7.95 7.95 0 0 0 4.8 10.9l1.8 1.35a5.96 5.96 0 0 1 2.2-1.87l1.55 1.55A3.98 3.98 0 0 0 8 15a4 4 0 0 0 4 4 3.98 3.98 0 0 0 3.07-1.45L20.73 23 22 21.72 2.28 3zM12 17a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7.56-8.45 1.44-1.08-.36-.45A11.9 11.9 0 0 0 15.5 4.7l-1.44 1.08a9.93 9.93 0 0 1 5.5 2.77zm-3.02 2.27 1.5 1.5a5.98 5.98 0 0 0-2.04-1.5zm-2.5-2.5 1.5 1.5A3.98 3.98 0 0 0 16 12a3.98 3.98 0 0 0-1.96.32z"/>
          </svg>
        )}
        <p className="text-white/70 text-sm">Hey {userProfile?.displayName} 👋</p>
        <div className="flex items-end justify-between mt-1">
          <div>
            <p className="text-white/60 text-[10px] uppercase tracking-widest">This month</p>
            <p className="text-white text-4xl font-bold tracking-tight mt-0.5">{formatINR(totalMonth)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[10px]">You · {partnerName}</p>
            <p className="text-white text-sm font-semibold">{formatINR(mySpend)} · {formatINR(partnerSpend)}</p>
          </div>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden flex">
          <div
            className="h-full bg-orange-400 transition-all duration-700"
            style={{ width: totalMonth > 0 ? `${(mySpend / totalMonth) * 100}%` : '0%' }}
          />
          <div className="h-full bg-yellow-300 flex-1" />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Stats row — Budget · Avg/day · Week vs last */}
        <div className="grid grid-cols-3 gap-2">
          {/* Budget chip */}
          {budget ? (
              <div className="bg-white rounded-xl p-3 shadow-card">
                <p className="text-lg">{budgetOver ? '🔴' : '💰'}</p>
                <p className="text-[10px] text-karcha-muted mt-0.5">Budget</p>
                <p className={`text-xs font-bold mt-0.5 truncate ${budgetOver ? 'text-red-500' : 'text-primary-600'}`}>
                  {budgetOver ? `−${formatINR(totalMonth - budget)}` : `${formatINR(budgetLeft)} left`}
                </p>
                <div className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${budgetOver ? 'bg-red-400' : 'bg-primary-500'}`}
                    style={{ width: `${budgetPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <Link to="/settings" className="bg-white rounded-xl p-3 shadow-card border border-dashed border-primary-200 flex flex-col justify-between">
                <p className="text-lg">💰</p>
                <p className="text-[10px] text-karcha-muted mt-0.5">Budget</p>
                <p className="text-xs font-semibold text-primary-500 mt-0.5">Set →</p>
              </Link>
            )
          }

          <div className="bg-white rounded-xl p-3 shadow-card">
            <p className="text-lg">🧾</p>
            <p className="text-[10px] text-karcha-muted mt-0.5">Today</p>
            <p className="text-xs font-bold text-karcha-text mt-0.5">{formatINR(todayTotal)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-card">
            <Sparkline weeks={weekData} />
            <p className="text-[10px] text-karcha-muted mt-0.5">Week vs last</p>
            <p className={`text-xs font-bold mt-0.5 ${weekData[1].total >= weekData[0].total ? 'text-red-500' : 'text-primary-600'}`}>
              {weekData[1].total >= weekData[0].total ? '↑' : '↓'} {formatINR(weekData[1].total)}
            </p>
          </div>
        </div>

        {/* Recent */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm font-bold text-karcha-text">Recent</p>
          <Link to="/expenses" className="text-primary-600 text-xs font-semibold">See all</Link>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {[['all','All'],['me','You'],['partner', partnerName]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === val ? 'bg-white text-primary-600 shadow-sm' : 'text-karcha-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : recent.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="text-3xl mb-2">🪙</p>
            <p className="font-semibold text-karcha-text text-sm">No expenses yet</p>
            <p className="text-karcha-muted text-xs mt-1">Tap Spend in the nav to add one.</p>
          </div>
        ) : (
          <div className="space-y-1.5 pb-2">
            {recent.map(exp => {
              const meta = getCategoryMeta(exp.category)
              const isMe = exp.paidBy === userProfile?.id
              return (
                <div key={exp.id} className={`rounded-xl px-4 py-3 flex items-center gap-3 shadow-card ${newExpenseIds.has(exp.id) ? 'animate-flash-green' : 'bg-white'}`}>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-karcha-text text-sm truncate">
                      {exp.description || meta.label}
                    </p>
                    <p className="text-karcha-muted text-xs mt-0.5">
                      {formatDate(exp.date)} · <span className={isMe ? 'text-primary-600 font-semibold' : 'text-accent-500 font-semibold'}>{isMe ? 'You' : partnerName}</span>
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
