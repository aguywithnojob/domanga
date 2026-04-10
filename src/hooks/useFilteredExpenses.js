import { useMemo } from 'react'
import { useExpenses } from '../contexts/ExpenseContext'
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export function useFilteredExpenses(from, to) {
  const { expenses } = useExpenses()

  return useMemo(() => {
    if (!from || !to) return expenses
    return expenses.filter(e =>
      isWithinInterval(new Date(e.date), {
        start: startOfDay(from),
        end:   endOfDay(to),
      })
    )
  }, [expenses, from, to])
}
