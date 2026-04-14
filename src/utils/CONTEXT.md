# src/utils/ — Context Summary

> Pure utility functions — no side effects, no Firestore, no React.
> **Keep this updated when categories, formatters, or scan utilities change.**

---

## `categories.js`

**Exports:**
- `CATEGORIES` — array of 15 built-in categories
- `getCategoryMeta(id)` — returns `{id, label, emoji}` for a given id; fallback if not found: `{label: id, emoji: '📦'}`
- `CATEGORY_COLORS` — object mapping category id → hex color (used in charts)

**Built-in category IDs:**
`rent`, `grocery`, `utilities`, `food`, `entertainment`, `transport`, `healthcare`, `shopping`, `travel`, `credit_card`, `laundry`, `car`, `bike`, `trip`, `others`

---

## `formatUtils.js`

**Exports:**

| Function | Returns | Notes |
|---|---|---|
| `formatINR(amount)` | `"₹1,23,456"` | Indian locale number format |
| `formatDate(date)` | `"5 Apr 2026"` | date-fns `d MMM yyyy` |
| `formatShortDate(date)` | `"5 Apr"` | date-fns `d MMM` |
| `thisMonthRange()` | `{ from, to }` | Start/end of current calendar month |
| `thisWeekRange()` | `{ from, to }` | Mon–Sun of current week |
| `lastMonthRange()` | `{ from, to }` | Start/end of previous calendar month |
| `toInputDate(date)` | `"2026-04-05"` | For HTML `<input type="date">` value |
| `parseShorthand(str)` | `number` | Parses `"1.5k"` → `1500`, `"2L"` → `200000` |

---

## `scanParser.js`

**Purpose:** OCR text parser for Scan feature. Pure functions, no side effects.

**Exports:**
- `DEFAULT_KEYWORD_RULES` — array of 60+ `{keyword, categoryId}` objects for Indian merchants (Zomato→food, BigBasket→grocery, Ola→transport, Amazon→shopping, Netflix→entertainment, Apollo→healthcare, Airtel→utilities, etc.)
- `matchCategory(text, firestoreRules)` — case-insensitive keyword search; Firestore admin rules checked first, then `DEFAULT_KEYWORD_RULES`; returns `categoryId` string or `'others'`
- `parseOCRText(rawText, firestoreRules)` — full parser: extracts ₹ amounts via `amountRe` regex, derives description from surrounding text, extracts date with `dateRe`, matches category, deduplicates near-identical amounts; returns `Array<{amount, description, date, categoryId}>`

**Notes:** Used by `ScanPage.jsx`. No imports from React or Firebase.
