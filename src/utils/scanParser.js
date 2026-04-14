import { CATEGORIES } from './categories'

// ─── Default keyword → category seed data ────────────────────────────────────
export const DEFAULT_KEYWORD_RULES = [
  // Food & Dining
  { keyword: 'zomato',      categoryId: 'food' },
  { keyword: 'swiggy',      categoryId: 'food' },
  { keyword: 'eatsure',     categoryId: 'food' },
  { keyword: 'dominos',     categoryId: 'food' },
  { keyword: "mcdonald",    categoryId: 'food' },
  { keyword: 'bistro',         categoryId: 'food' },
  { keyword: 'starbucks',   categoryId: 'food' },
  { keyword: "cafe coffee", categoryId: 'food' },
  // Grocery
  { keyword: 'bigbasket',   categoryId: 'grocery' },
  { keyword: 'big basket',  categoryId: 'grocery' },
  { keyword: 'zepto',       categoryId: 'grocery' },
  { keyword: 'blinkit',     categoryId: 'grocery' },
  { keyword: 'instamart',       categoryId: 'grocery' },
  { keyword: 'supermarket', categoryId: 'grocery' },
  // Transport
  { keyword: 'ola',         categoryId: 'transport' },
  { keyword: 'uber',        categoryId: 'transport' },
  { keyword: 'rapido',      categoryId: 'transport' },
  { keyword: 'yulu',        categoryId: 'transport' },
  { keyword: 'metro',       categoryId: 'transport' },
  { keyword: 'irctc',       categoryId: 'transport' },
  { keyword: 'indigo',      categoryId: 'transport' },
  { keyword: 'air india',   categoryId: 'transport' },
  { keyword: 'bus',         categoryId: 'transport' },
  // Shopping
  { keyword: 'amazon',      categoryId: 'shopping' },
  { keyword: 'flipkart',    categoryId: 'shopping' },
  { keyword: 'myntra',      categoryId: 'shopping' },
  { keyword: 'ajio',        categoryId: 'shopping' },
  { keyword: 'nykaa',       categoryId: 'shopping' },
  { keyword: 'meesho',      categoryId: 'shopping' },
  // Entertainment
  { keyword: 'netflix',     categoryId: 'entertainment' },
  { keyword: 'hotstar',     categoryId: 'entertainment' },
  { keyword: 'disney',      categoryId: 'entertainment' },
  { keyword: 'spotify',     categoryId: 'entertainment' },
  { keyword: 'youtube',     categoryId: 'entertainment' },
  { keyword: 'bookmyshow',  categoryId: 'entertainment' },
  { keyword: 'pvr',         categoryId: 'entertainment' },
  { keyword: 'inox',        categoryId: 'entertainment' },
  // Healthcare
  { keyword: 'apollo',      categoryId: 'healthcare' },
  { keyword: 'medplus',     categoryId: 'healthcare' },
  { keyword: 'practo',      categoryId: 'healthcare' },
  { keyword: '1mg',         categoryId: 'healthcare' },
  { keyword: 'pharmeasy',   categoryId: 'healthcare' },
  { keyword: 'netmeds',     categoryId: 'healthcare' },
  { keyword: 'medical',     categoryId: 'healthcare' },
  // Utilities
  { keyword: 'bescom',      categoryId: 'utilities' },
  { keyword: 'bwssb',       categoryId: 'utilities' },
  { keyword: 'tata power',  categoryId: 'utilities' },
  { keyword: 'adani',       categoryId: 'utilities' },
  { keyword: 'airtel',      categoryId: 'utilities' },
  { keyword: 'jio',         categoryId: 'utilities' },
  { keyword: 'vi ',         categoryId: 'utilities' },
  { keyword: 'bsnl',        categoryId: 'utilities' },
  { keyword: 'electricity', categoryId: 'utilities' },
  { keyword: 'water bill',  categoryId: 'utilities' },
]

/**
 * Match a single text line to a category using keyword rules (Firestore rules first, then defaults).
 * Matching is case-insensitive. Returns categoryId string or 'others'.
 */
export function matchCategory(text, firestoreRules = []) {
  const lower = text.toLowerCase()
  // Firestore admin rules take priority
  for (const rule of firestoreRules) {
    if (rule.keyword && lower.includes(rule.keyword.toLowerCase())) {
      return rule.categoryId
    }
  }
  // Fall back to built-in defaults
  for (const rule of DEFAULT_KEYWORD_RULES) {
    if (lower.includes(rule.keyword)) return rule.categoryId
  }
  return 'others'
}

/**
 * Parse OCR raw text into a list of candidate transactions.
 * Returns array of { description, amount, categoryId, date }
 *
 * Handles common Indian bank SMS / app formats:
 *   "Paid ₹450 to Zomato"
 *   "Debit ₹1,200 AMAZON"
 *   "₹ 85.00 BigBasket 14 Apr"
 */
export function parseOCRText(rawText, firestoreRules = []) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const results = []
  const today = new Date()

  // Regex to find ₹ amounts — handles ₹450, ₹ 450, Rs.450, Rs 450, INR 450
  const amountRe = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i
  // Regex to find DD Mon or Mon DD patterns
  const dateRe = /\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})\b/i

  // Group lines into blocks — a block contains an amount
  // Try to extract one transaction per amount found
  const fullText = lines.join(' ')
  const allAmountMatches = [...fullText.matchAll(new RegExp(amountRe.source, 'gi'))]

  if (allAmountMatches.length === 0) return []

  for (const match of allAmountMatches) {
    const raw = match[1].replace(/,/g, '')
    const amount = parseFloat(raw)
    if (!amount || amount <= 0 || amount > 500000) continue

    // Context = 80 chars around the match for description/date extraction
    const start = Math.max(0, match.index - 60)
    const end   = Math.min(fullText.length, match.index + 80)
    const ctx   = fullText.slice(start, end)

    // Extract description — take first meaningful word cluster before/after amount
    const descClean = ctx
      .replace(amountRe, '')
      .replace(/paid|debit|credit|debited|credited|to|from|at|on|via|upi|ref|txn|transaction|no\.|#/gi, ' ')
      .replace(/\d{6,}/g, '') // strip long ref numbers
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50)

    // Extract date if present
    const dateMatch = ctx.match(dateRe)
    let date = today
    if (dateMatch) {
      try {
        const raw = dateMatch[0]
        date = new Date(`${raw} ${today.getFullYear()}`)
        if (isNaN(date.getTime())) date = today
      } catch { date = today }
    }

    const categoryId = matchCategory(ctx, firestoreRules)

    results.push({
      description: descClean || 'Transaction',
      amount,
      categoryId,
      date: date.toISOString().split('T')[0],
    })
  }

  // Deduplicate — same amount + same category within 3 chars description
  const seen = new Set()
  return results.filter(r => {
    const key = `${r.amount}-${r.categoryId}-${r.description.slice(0, 6)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
