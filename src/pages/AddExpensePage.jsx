import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '../contexts/ExpenseContext'
import { CATEGORIES } from '../utils/categories'
import { toInputDate } from '../utils/formatUtils'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'

export default function AddExpensePage() {
  const navigate = useNavigate()
  const { addNew } = useExpenses()

  const [amount, setAmount]       = useState('')
  const [category, setCategory]   = useState('')
  const [description, setDesc]    = useState('')
  const [date, setDate]           = useState(toInputDate(new Date()))
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSave() {
    setError('')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0)  { setError('Enter a valid amount.'); return }
    if (!category)         { setError('Select a category.'); return }
    if (!date)             { setError('Select a date.'); return }
    setLoading(true)
    try {
      await addNew({ amount: amt, category, description: description.trim(), date })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Add Expense" backTo="/dashboard" />

      <div className="px-5 mt-4 space-y-5">
        {/* Amount */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">Amount</label>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-primary-600">₹</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 text-4xl font-extrabold text-karcha-text outline-none bg-transparent placeholder-gray-200"
            />
          </div>
        </div>

        {/* Category grid */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border-2 transition-all ${
                  category === cat.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-karcha-border bg-gray-50 hover:border-primary-200'
                }`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className={`text-[10px] font-semibold text-center leading-tight ${
                  category === cat.id ? 'text-primary-600' : 'text-karcha-muted'
                }`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date + Description */}
        <div className="bg-white rounded-3xl shadow-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={toInputDate(new Date())}
              className="w-full border border-karcha-border rounded-2xl px-4 py-3 text-karcha-text font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-2">Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Big Basket order"
              value={description}
              onChange={e => setDesc(e.target.value)}
              className="w-full border border-karcha-border rounded-2xl px-4 py-3 text-karcha-text font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-2xl text-base shadow-lg disabled:opacity-60 transition-colors"
        >
          {loading ? 'Saving…' : 'Save Expense'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
