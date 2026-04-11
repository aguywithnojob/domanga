import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useExpenses } from '../contexts/ExpenseContext'
import { useFlags } from '../contexts/FeatureFlagContext'
import { CATEGORY_COLORS, getCategoryMeta, CATEGORIES } from '../utils/categories'
import { formatINR, toInputDate, thisMonthRange, thisWeekRange, lastMonthRange } from '../utils/formatUtils'
import { isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns'
import {
  Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'

function BudgetSparkline({ data, over, partnerName = 'Partner' }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.me, d.partner)), 1)
  const W = 200, H = 44, pad = 4
  function calcPts(key) {
    return data.map((d, i) => {
      const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2)
      const y = H - pad - (d[key] / maxVal) * (H - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
  }
  const mePts      = calcPts('me')
  const partnerPts = calcPts('partner')
  const meColor      = '#3b82f6'  // blue — fixed for both users
  const partnerColor = '#f97316'  // orange — fixed for both users
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 44 }}>
        <polyline points={mePts.join(' ')} fill="none" stroke={meColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <polyline points={partnerPts.join(' ')} fill="none" stroke={partnerColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      </svg>
      <div className="flex gap-3 mt-1">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: meColor }} />
          <span className="text-[9px] text-karcha-muted">You</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: partnerColor }} />
          <span className="text-[9px] text-karcha-muted">{partnerName}</span>
        </div>
      </div>
    </div>
  )
}

const PRESETS = [
  { id: 'month', label: 'This Month' },
  { id: 'week',  label: 'This Week'  },
  { id: 'last',  label: 'Last Month' },
  { id: 'custom',label: 'Custom'     },
]

function getPresetRange(id) {
  if (id === 'month') return thisMonthRange()
  if (id === 'week')  return thisWeekRange()
  if (id === 'last')  return lastMonthRange()
  return null
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const { name, value } = payload[0]
    return (
      <div className="bg-white border border-karcha-border rounded-xl px-3 py-2 shadow-card text-sm">
        <p className="font-semibold text-karcha-text">{name}</p>
        <p className="text-primary-600 font-bold">{formatINR(value)}</p>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const { userProfile, partnerProfile } = useAuth()
  const { expenses, budget, categoryBudgets, loading } = useExpenses()
  const flags = useFlags()
  const partnerName = partnerProfile?.displayName || 'Partner'

  const [preset, setPreset]     = useState('month')
  const [fromDate, setFromDate] = useState(toInputDate(thisMonthRange().from))
  const [toDate, setToDate]     = useState(toInputDate(thisMonthRange().to))

  const range = useMemo(() => {
    if (preset !== 'custom') return getPresetRange(preset)
    return { from: new Date(fromDate), to: new Date(toDate) }
  }, [preset, fromDate, toDate])

  const filtered = useMemo(() => {
    if (!range) return expenses
    return expenses.filter(e =>
      isWithinInterval(new Date(e.date), { start: startOfDay(range.from), end: endOfDay(range.to) })
    )
  }, [expenses, range])

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map = {}
    filtered.forEach(e => {
      const meta = getCategoryMeta(e.category)
      map[e.category] = map[e.category] || { name: meta.label, value: 0, emoji: meta.emoji }
      map[e.category].value += e.amount
    })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [filtered])

  // Per-person bar chart
  const personData = useMemo(() => {
    const you     = { name: userProfile?.displayName || 'You', value: 0 }
    const partner = { name: partnerName, value: 0 }
    filtered.forEach(e => {
      if (e.paidBy === userProfile?.id) you.value += e.amount
      else partner.value += e.amount
    })
    return [you, partner]
  }, [filtered, userProfile, partnerName])

  const total    = filtered.reduce((s, e) => s + e.amount, 0)
  const myTotal  = personData[0]?.value || 0

  // Budget insight — always based on current month regardless of preset
  const monthRange = thisMonthRange()
  const monthExpenses = useMemo(() =>
    expenses.filter(e =>
      isWithinInterval(new Date(e.date), { start: startOfDay(monthRange.from), end: endOfDay(monthRange.to) })
    ), [expenses])
  const monthTotal   = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const budgetPct    = budget ? Math.min((monthTotal / budget) * 100, 100) : 0
  const budgetOver   = budget && monthTotal > budget
  const budgetLeft   = budget ? Math.max(budget - monthTotal, 0) : 0
  const today        = new Date()
  const daysInMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysPassed   = today.getDate()

  // Daily spend sparkline — per-person split for each day of current month
  const dailySparkData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthRange.from, end: today })
    return days.map(d => {
      const dayExp = monthExpenses.filter(e => {
        const ed = new Date(e.date)
        return ed.getFullYear() === d.getFullYear() &&
               ed.getMonth()    === d.getMonth()    &&
               ed.getDate()     === d.getDate()
      })
      return {
        me:      dayExp.filter(e => e.paidBy === userProfile?.id).reduce((s, e) => s + e.amount, 0),
        partner: dayExp.filter(e => e.paidBy !== userProfile?.id).reduce((s, e) => s + e.amount, 0),
      }
    })
  }, [monthExpenses, userProfile])

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Insights" />

      <div className="px-5 mt-4 space-y-5">
        {/* Preset tabs */}
        <div className="flex bg-white rounded-2xl p-1 shadow-card gap-1">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                preset === p.id ? 'bg-primary-600 text-white shadow' : 'text-karcha-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Budget insight card — only shown on This Month preset */}
        {preset === 'month' && budget ? (
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest">Monthly Budget</p>
                <p className="text-xl font-extrabold text-karcha-text mt-0.5">{formatINR(budget)}</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold ${budgetOver ? 'text-red-500' : 'text-primary-600'}`}>
                  {budgetOver ? `Over by ${formatINR(monthTotal - budget)}` : `${formatINR(budgetLeft)} left`}
                </p>
                <p className="text-[10px] text-karcha-muted mt-0.5">{daysPassed}/{daysInMonth} days</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ${budgetOver ? 'bg-red-500' : 'bg-primary-500'}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <p className="text-[10px] text-karcha-muted">{formatINR(monthTotal)} spent</p>
              <p className="text-[10px] text-karcha-muted">{Math.round(budgetPct)}%</p>
            </div>

            {/* Daily sparkline */}
            {dailySparkData.length > 1 && (
              <div className="mt-3">
                <p className="text-[10px] text-karcha-muted mb-1">Daily spend this month</p>
                <BudgetSparkline data={dailySparkData} over={budgetOver} partnerName={partnerName} />
              </div>
            )}
          </div>
        ) : preset === 'month' && !budget ? (
          <a href="#/settings" className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card border border-dashed border-primary-200">
            <p className="text-sm text-karcha-muted">Set a monthly budget to track progress</p>
            <span className="text-primary-600 text-sm font-semibold">→</span>
          </a>
        ) : null}

        {/* Custom date range */}
        {preset === 'custom' && (
          <div className="flex gap-2 bg-white rounded-2xl p-4 shadow-card">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-wider block mb-1">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full border border-karcha-border rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-primary-500" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-wider block mb-1">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full border border-karcha-border rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-primary-500" />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-card">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-karcha-text">No data for this period</p>
            <p className="text-karcha-muted text-sm mt-1">Add expenses or change the date range.</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-card">
                <p className="text-xs text-karcha-muted font-semibold uppercase tracking-widest mb-1">Total</p>
                <p className="text-xl font-extrabold text-primary-600">{formatINR(total)}</p>
                <p className="text-xs text-karcha-muted mt-1">{filtered.length} transactions</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-card">
                <p className="text-xs text-karcha-muted font-semibold uppercase tracking-widest mb-1">Your Share</p>
                <p className="text-xl font-extrabold text-accent-500">{formatINR(myTotal)}</p>
                <p className="text-xs text-karcha-muted mt-1">
                  {total > 0 ? Math.round((myTotal / total) * 100) : 0}% of total
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-3xl p-5 shadow-card">
              <h3 className="font-bold text-karcha-text mb-3">Category Breakdown</h3>
              <div className="space-y-3">
                {categoryData.map((cat) => {
                  const catId = CATEGORIES.find(c => c.label === cat.name)?.id || 'others'
                  const pct = total > 0 ? (cat.value / total) * 100 : 0
                  const catBudget = flags.enableBudget ? (categoryBudgets?.[catId] ?? null) : null
                  const budgetPct = catBudget ? Math.min((cat.value / catBudget) * 100, 100) : 0
                  const isOver = catBudget && cat.value > catBudget
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat.emoji}</span>
                          <span className="text-sm font-semibold text-karcha-text">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-karcha-text">{formatINR(cat.value)}</span>
                          {catBudget ? (
                            <span className={`text-xs ml-2 font-semibold ${isOver ? 'text-red-500' : 'text-karcha-muted'}`}>
                              {isOver ? `↑ over` : `/ ${formatINR(catBudget)}`}
                            </span>
                          ) : (
                            <span className="text-xs text-karcha-muted ml-2">{Math.round(pct)}%</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        {catBudget ? (
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${budgetPct}%`, backgroundColor: isOver ? '#ef4444' : (CATEGORY_COLORS[catId] || '#6b7280') }}
                          />
                        ) : (
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[catId] || '#6b7280' }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* You vs Partner */}
            <div className="bg-white rounded-3xl p-5 shadow-card">
              <h3 className="font-bold text-karcha-text mb-4">You vs {partnerName}</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={personData} barSize={56}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    <Cell fill="#d97706" />
                    <Cell fill="#ec4899" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
