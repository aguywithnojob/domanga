# src/utils/ — Context Summary

> Pure utility functions — no side effects, no Firestore, no React.
> **Keep this updated when categories or formatters change.**

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
