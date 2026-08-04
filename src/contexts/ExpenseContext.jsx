import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { subscribeExpenses, addExpense, deleteExpense, updateExpense, getCouple, getExpensesInRange, EXPENSE_WINDOW_MONTHS } from '../firebase/db'

const ExpenseContext = createContext(null)

export function ExpenseProvider({ children }) {
  const { userProfile } = useAuth()
  const [expenses, setExpenses]           = useState([])
  const [rawBudget, setRawBudget]         = useState(null)
  const [categoryBudgets, setCatBudgets]  = useState({})
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    if (!userProfile?.coupleId) {
      setExpenses([])
      setLoading(false)
      return
    }
    setLoading(true)
    // Fetch budget once (budget changes are infrequent)
    getCouple(userProfile.coupleId).then(c => {
      setRawBudget(c?.monthlyBudget ?? null)
      setCatBudgets(c?.categoryBudgets ?? {})
    })
    // Real-time listener — auto-updates for both users instantly
    const unsub = subscribeExpenses(userProfile.coupleId, data => {
      setExpenses(data)
      setLoading(false)
    })
    return unsub
  }, [userProfile?.coupleId])

  // Total budget is derived from the sum of category budgets, falling back to the
  // legacy stored monthlyBudget for couples who set one before category budgets existed.
  const budget = useMemo(() => {
    const sum = Object.values(categoryBudgets).reduce((a, v) => a + (Number(v) || 0), 0)
    return sum > 0 ? sum : rawBudget
  }, [categoryBudgets, rawBudget])

  async function addNew(data) {
    // Don't await — addDoc resolves only when server confirms.
    // Local cache + onSnapshot update the list immediately offline too.
    addExpense(userProfile.coupleId, userProfile.id, data)
  }

  async function edit(id, data) {
    await updateExpense(id, data)
  }

  async function remove(id) {
    await deleteExpense(id)
  }

  // On-demand fetch for date ranges older than the real-time window
  // (see EXPENSE_WINDOW_MONTHS). Does not touch the live `expenses` list.
  async function fetchRange(from, to) {
    if (!userProfile?.coupleId) return []
    return getExpensesInRange(userProfile.coupleId, from, to)
  }

  return (
    <ExpenseContext.Provider value={{ expenses, budget, categoryBudgets, loading, addNew, edit, remove, fetchRange, windowMonths: EXPENSE_WINDOW_MONTHS }}>
      {children}
    </ExpenseContext.Provider>
  )
}

export function useExpenses() {
  return useContext(ExpenseContext)
}
