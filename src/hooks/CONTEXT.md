# src/hooks/ — Context Summary

> Custom React hooks. Read before adding new hooks or modifying filtering logic.
> **Keep this updated when hook signatures or behavior changes.**

---

## `useCategories.js`

**Returns:** `categories` — array of `{id, label, emoji}` objects

**Behavior:**
- Fetches `config/categories` from Firestore (one-time, on mount)
- Merges: `static CATEGORIES` + `custom[]` from Firestore
- Filters out IDs in `disabled[]`
- Falls back to full static list on any Firestore error

**Used by:** AddExpensePage, EditExpensePage

---

## `useFilteredExpenses.js`

**Signature:** `useFilteredExpenses(from, to)` → `{ filtered }`

**Behavior:**
- Consumes `useExpenses()` from ExpenseContext
- Filters expenses within `[startOfDay(from), endOfDay(to)]` interval
- Returns all expenses if `from` or `to` is null

**Used by:** ExpensesPage
