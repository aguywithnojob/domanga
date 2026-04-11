import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { subscribeExpenses, addExpense, deleteExpense, updateExpense, getCouple } from '../firebase/db'

const ExpenseContext = createContext(null)

export function ExpenseProvider({ children }) {
  const { userProfile } = useAuth()
  const [expenses, setExpenses]           = useState([])
  const [budget, setBudget]               = useState(null)
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
      setBudget(c?.monthlyBudget ?? null)
      setCatBudgets(c?.categoryBudgets ?? {})
    })
    // Real-time listener — auto-updates for both users instantly
    const unsub = subscribeExpenses(userProfile.coupleId, data => {
      setExpenses(data)
      setLoading(false)
    })
    return unsub
  }, [userProfile?.coupleId])

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

  return (
    <ExpenseContext.Provider value={{ expenses, budget, categoryBudgets, loading, addNew, edit, remove }}>
      {children}
    </ExpenseContext.Provider>
  )
}

export function useExpenses() {
  return useContext(ExpenseContext)
}
