import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '../contexts/ExpenseContext'
import { useCategories } from '../hooks/useCategories'
import { toInputDate } from '../utils/formatUtils'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'

export default function AddExpensePage() {
  const navigate = useNavigate()
  const { addNew } = useExpenses()
  const categories = useCategories()

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
      <Header title="Spend" backTo="/dashboard" />

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

        {/* Category dropdown */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">Category</label>
          <div className="relative">
            {!category && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
                📦
              </span>
            )}
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={`w-full border rounded-2xl ${category ? 'pl-4' : 'pl-12'} pr-10 py-3.5 text-sm font-semibold outline-none appearance-none transition-colors ${
                category
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-karcha-border bg-gray-50 text-karcha-muted'
              }`}
            >
              <option value="" disabled>Select a category…</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label}</option>
              ))}
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-karcha-muted pointer-events-none text-xs">▾</span>
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
