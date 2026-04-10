import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useExpenses } from '../contexts/ExpenseContext'
import { CATEGORY_COLORS, getCategoryMeta, CATEGORIES } from '../utils/categories'
import { formatINR, toInputDate, thisMonthRange, thisWeekRange, lastMonthRange } from '../utils/formatUtils'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'

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
  const { userProfile } = useAuth()
  const { expenses, loading } = useExpenses()

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
    const partner = { name: 'Partner', value: 0 }
    filtered.forEach(e => {
      if (e.paidBy === userProfile?.id) you.value += e.amount
      else partner.value += e.amount
    })
    return [you, partner]
  }, [filtered, userProfile])

  const total    = filtered.reduce((s, e) => s + e.amount, 0)
  const myTotal  = personData[0]?.value || 0
  const topCat   = categoryData[0]

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Analytics" />

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
              {topCat && (
                <div className="col-span-2 bg-white rounded-2xl p-4 shadow-card">
                  <p className="text-xs text-karcha-muted font-semibold uppercase tracking-widest mb-1">Top Category</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{topCat.emoji}</span>
                    <div>
                      <p className="font-bold text-karcha-text">{topCat.name}</p>
                      <p className="text-karcha-muted text-xs">{formatINR(topCat.value)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category Donut */}
            <div className="bg-white rounded-3xl p-5 shadow-card">
              <h3 className="font-bold text-karcha-text mb-4">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[CATEGORIES.find(c => c.label === entry.name)?.id] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-xs text-karcha-text font-medium">{value}</span>}
                    iconType="circle"
                    iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown list */}
            <div className="bg-white rounded-3xl p-5 shadow-card">
              <h3 className="font-bold text-karcha-text mb-3">Category Breakdown</h3>
              <div className="space-y-3">
                {categoryData.map((cat) => {
                  const catId = CATEGORIES.find(c => c.label === cat.name)?.id || 'others'
                  const pct = total > 0 ? (cat.value / total) * 100 : 0
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat.emoji}</span>
                          <span className="text-sm font-semibold text-karcha-text">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-karcha-text">{formatINR(cat.value)}</span>
                          <span className="text-xs text-karcha-muted ml-2">{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[catId] || '#6b7280' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per-person bar chart */}
            <div className="bg-white rounded-3xl p-5 shadow-card">
              <h3 className="font-bold text-karcha-text mb-4">You vs Partner</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={personData} barSize={48}>
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
