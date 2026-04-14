# src/hooks/ — Context Summary

> Custom React hooks. Read before adding new hooks or modifying filtering logic.
> **Keep this updated when hook signatures or behavior changes.**

---

## `useCategories.js`

**Returns:** `categories` — array of `{id, label, emoji}` objects

**Behavior:**
- **Real-time** — uses `onSnapshot` on `config/categories` Firestore doc
- Merges: `static CATEGORIES` + `custom[]` from Firestore
- Filters out IDs in `disabled[]`
- Falls back to full static list on any Firestore error or permission denial
- Listener is cleaned up on unmount

**Used by:** AddExpensePage, EditExpensePage, CategoryBudgetPage

---

## `useFilteredExpenses.js`

**Signature:** `useFilteredExpenses(from, to)` → `{ filtered }`

**Behavior:**
- Consumes `useExpenses()` from ExpenseContext
- Filters expenses within `[startOfDay(from), endOfDay(to)]` interval
- Returns all expenses if `from` or `to` is null

**Used by:** ExpensesPage
