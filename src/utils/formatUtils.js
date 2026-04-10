import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns'

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date) {
  return format(new Date(date), 'd MMM yyyy')
}

export function formatShortDate(date) {
  return format(new Date(date), 'd MMM')
}

export function thisMonthRange() {
  const now = new Date()
  return { from: startOfMonth(now), to: endOfMonth(now) }
}

export function thisWeekRange() {
  const now = new Date()
  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
}

export function lastMonthRange() {
  const last = subMonths(new Date(), 1)
  return { from: startOfMonth(last), to: endOfMonth(last) }
}

export function toInputDate(date) {
  return format(new Date(date), 'yyyy-MM-dd')
}
