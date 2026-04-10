import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getExpenses, addExpense, deleteExpense } from '../firebase/db'

const ExpenseContext = createContext(null)

export function ExpenseProvider({ children }) {
  const { userProfile } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(false)

  const fetchExpenses = useCallback(async () => {
    if (!userProfile?.coupleId) { setExpenses([]); return }
    setLoading(true)
    try {
      const data = await getExpenses(userProfile.coupleId)
      setExpenses(data)
    } finally {
      setLoading(false)
    }
  }, [userProfile?.coupleId])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  async function addNew(data) {
    await addExpense(userProfile.coupleId, userProfile.id, data)
    await fetchExpenses()
  }

  async function remove(id) {
    await deleteExpense(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return (
    <ExpenseContext.Provider value={{ expenses, loading, addNew, remove, refresh: fetchExpenses }}>
      {children}
    </ExpenseContext.Provider>
  )
}

export function useExpenses() {
  return useContext(ExpenseContext)
}
