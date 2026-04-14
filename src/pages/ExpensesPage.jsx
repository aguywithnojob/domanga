import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useExpenses } from '../contexts/ExpenseContext'
import { CATEGORIES, getCategoryMeta } from '../utils/categories'
import { formatINR, formatDate, toInputDate, thisMonthRange } from '../utils/formatUtils'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'
import ExpenseDetailSheet from '../components/common/ExpenseDetailSheet'

const FILTER_PERSON = ['all', 'me', 'partner']

export default function ExpensesPage() {
  const { firebaseUser, partnerProfile } = useAuth()
  const navigate = useNavigate()
  const { expenses, loading, remove } = useExpenses()
  const partnerName = partnerProfile?.displayName || 'Partner'

  const { from: mFrom, to: mTo } = thisMonthRange()

  const [fromDate, setFromDate] = useState(toInputDate(mFrom))
  const [toDate, setToDate]     = useState(toInputDate(mTo))
  const [catFilter, setCatFilter] = useState('all')
  const [personFilter, setPerson] = useState('all')
  const [deleting, setDeleting]   = useState(null)
  const [selected, setSelected]   = useState(null)
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const inRange = isWithinInterval(new Date(e.date), {
        start: startOfDay(new Date(fromDate)),
        end:   endOfDay(new Date(toDate)),
      })
      const inCat    = catFilter === 'all' || e.category === catFilter
      const inPerson = personFilter === 'all'
        || (personFilter === 'me' && e.paidBy === firebaseUser?.uid)
        || (personFilter === 'partner' && e.paidBy !== firebaseUser?.uid)
      return inRange && inCat && inPerson
    })
  }, [expenses, fromDate, toDate, catFilter, personFilter, firebaseUser])

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  async function handleDelete(id) {
    setDeleting(id)
    await remove(id)
    setDeleting(null)
    setSelected(null)
  }

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="All Expenses" />

      {/* Filters */}
      <div className="px-5 pt-3 pb-2 space-y-3 bg-white border-b border-karcha-border">
        {/* Date range */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-wider block mb-1">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="w-full border border-karcha-border rounded-xl px-3 py-2 text-xs font-medium text-karcha-text outline-none focus:border-primary-500" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-wider block mb-1">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="w-full border border-karcha-border rounded-xl px-3 py-2 text-xs font-medium text-karcha-text outline-none focus:border-primary-500" />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[{ id: 'all', label: 'All', emoji: '🔎' }, ...CATEGORIES].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCatFilter(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                catFilter === cat.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-gray-50 text-karcha-muted border-karcha-border'
              }`}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Person filter */}
        <div className="flex gap-2">
          {FILTER_PERSON.map(p => (
            <button
              key={p}
              onClick={() => setPerson(p)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition-all ${
                personFilter === p
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-gray-50 text-karcha-muted border-karcha-border'
              }`}
            >
              {p === 'me' ? '👤 You' : p === 'partner' ? `👤 ${partnerName}` : '👥 All'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-karcha-muted text-sm">{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</p>
        <p className="font-bold text-primary-600 text-sm">{formatINR(total)}</p>
      </div>

      {/* List */}
      <div className="px-5 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-card mt-4">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-karcha-text">No expenses found</p>
            <p className="text-karcha-muted text-sm mt-1">Try adjusting the filters.</p>
          </div>
        ) : (
          filtered.map(exp => {
            const meta = getCategoryMeta(exp.category)
            const isMe = exp.paidBy === userProfile?.id
            return (
              <button
                key={exp.id}
                onClick={() => setSelected(exp)}
                className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
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
              </button>
            )
          })
        )}
      </div>

      {selected && (
        <ExpenseDetailSheet
          exp={selected}
          isMe={selected.paidBy === firebaseUser?.uid}
          partnerName={partnerName}
          onClose={() => setSelected(null)}
          onEdit={() => { setSelected(null); navigate(`/edit/${selected.id}`) }}
          onDelete={() => handleDelete(selected.id)}
          deleting={deleting === selected.id}
        />
      )}

      <BottomNav />
    </div>
  )
}
