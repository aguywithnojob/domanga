import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns'

/**
 * Parses shorthand amounts: "2k" → "2000", "1.5L" → "150000"
 * Returns the resolved string, or the original if no suffix matched.
 */
export function parseShorthand(val) {
  const trimmed = String(val).trim()
  const match = trimmed.match(/^([\d.]+)\s*([kKlL])?$/)
  if (!match) return trimmed
  const num = parseFloat(match[1])
  if (isNaN(num)) return trimmed
  const suffix = match[2]?.toLowerCase()
  if (suffix === 'k') return String(num * 1_000)
  if (suffix === 'l') return String(num * 100_000)
  return trimmed
}

/**
 * Filters keystrokes to only allow valid amount characters:
 * digits, one decimal point, and K/L shorthand suffixes.
 * Use as onChange handler: onChange={e => setAmount(filterAmountInput(e.target.value))}
 */
export function filterAmountInput(val) {
  // Allow only digits, dot, k, K, l, L
  return val.replace(/[^0-9.kKlL]/g, '')
}

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
