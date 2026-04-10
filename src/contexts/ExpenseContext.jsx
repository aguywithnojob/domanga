import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getExpenses, addExpense, deleteExpense, updateExpense, getCouple } from '../firebase/db'

const ExpenseContext = createContext(null)

export function ExpenseProvider({ children }) {
  const { userProfile } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [budget, setBudget]     = useState(null)
  const [loading, setLoading]   = useState(false)

  const fetchExpenses = useCallback(async () => {
    if (!userProfile?.coupleId) { setExpenses([]); return }
    setLoading(true)
    try {
      const [data, couple] = await Promise.all([
        getExpenses(userProfile.coupleId),
        getCouple(userProfile.coupleId),
      ])
      setExpenses(data)
      setBudget(couple?.monthlyBudget ?? null)
    } finally {
      setLoading(false)
    }
  }, [userProfile?.coupleId])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  async function addNew(data) {
    await addExpense(userProfile.coupleId, userProfile.id, data)
    await fetchExpenses()
  }

  async function edit(id, data) {
    await updateExpense(id, data)
    await fetchExpenses()
  }

  async function remove(id) {
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return (
    <ExpenseContext.Provider value={{ expenses, budget, loading, addNew, edit, remove, refresh: fetchExpenses }}>
      {children}
    </ExpenseContext.Provider>
  )
}

export function useExpenses() {
  return useContext(ExpenseContext)
}
