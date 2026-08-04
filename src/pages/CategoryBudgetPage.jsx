import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { getCouple, setCategoryBudgets } from '../firebase/db'
import { parseShorthand, filterAmountInput } from '../utils/formatUtils'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'

export default function CategoryBudgetPage() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const categories = useCategories()
  const [existingBudgets, setExistingBudgets] = useState({})
  const [inputs, setInputs] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Load couple's saved budgets once
  useEffect(() => {
    async function load() {
      if (userProfile?.coupleId) {
        const c = await getCouple(userProfile.coupleId)
        setExistingBudgets(c?.categoryBudgets || {})
      }
      setLoading(false)
    }
    load()
  }, [userProfile])

  // Re-initialise inputs whenever categories (static + custom) or saved budgets change
  useEffect(() => {
    const init = {}
    categories.forEach(cat => {
      init[cat.id] = existingBudgets[cat.id] ? String(existingBudgets[cat.id]) : ''
    })
    setInputs(init)
  }, [categories, existingBudgets])

  async function handleSave() {
    setSaving(true)
    const budgets = {}
    categories.forEach(cat => {
      const v = parseFloat(inputs[cat.id])
      if (v > 0) budgets[cat.id] = v
    })
    await setCategoryBudgets(userProfile.coupleId, budgets)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-karcha-bg">
        <Header title="Category Budgets" backTo="/settings" />
        <div className="flex justify-center pt-20"><Spinner size="lg" /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Category Budgets" backTo="/settings" />

      <div className="px-4 mt-5 space-y-2">
        <p className="text-xs text-karcha-muted px-1 mb-3">
          Set a monthly limit per category. Leave blank to skip tracking for that category.
        </p>

        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl px-4 py-3 shadow-card flex items-center gap-3">
            <span className="text-xl w-8 text-center flex-shrink-0">{cat.emoji}</span>
            <p className="flex-1 text-sm font-semibold text-karcha-text">{cat.label}</p>
            <div className="flex items-center gap-1.5 border border-karcha-border rounded-lg px-2.5 py-1.5 focus-within:border-primary-500 w-28 flex-shrink-0">
              <span className="text-primary-600 font-bold text-xs">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={inputs[cat.id] || ''}
                onChange={e => setInputs(prev => ({ ...prev, [cat.id]: filterAmountInput(e.target.value) }))}
                onBlur={e => setInputs(prev => ({ ...prev, [cat.id]: parseShorthand(e.target.value) }))}
                className="flex-1 min-w-0 outline-none text-karcha-text font-semibold text-sm bg-transparent"
              />
            </div>
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-primary-600 text-white rounded-xl text-sm font-bold mt-4 active:scale-95 transition-transform disabled:opacity-60"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Budgets'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
