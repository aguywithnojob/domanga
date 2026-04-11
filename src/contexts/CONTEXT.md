# src/contexts/ — Context Summary

> All React context providers. Read before touching state or adding new providers.
> **Keep this updated when context shape changes.**

---

## Provider Tree (order matters)

```
FlagProvider        ← outermost (flags needed by AuthProvider children)
  AuthProvider      ← auth state + profiles
    ExpenseProvider ← depends on coupleId from AuthContext
      AppRoutes
```

---

## `AuthContext.jsx`

**Hook:** `useAuth()`

**Provides:**
| Value | Type | Description |
|---|---|---|
| `firebaseUser` | Firebase User \| null | Raw Firebase auth user |
| `userProfile` | object \| null | Firestore `users/{uid}` doc |
| `partnerProfile` | object \| null | Firestore `users/{partnerId}` doc |
| `loading` | boolean | True while auth state loading (prevents flash) |
| `refreshProfile()` | async fn | Re-fetches user + partner profiles from Firestore |

**Behavior:**
- Listens to `onAuthStateChanged`
- On login: fetches `userProfile`, then fetches `partnerProfile` if `userProfile.partnerId` set
- `partnerProfile` is null if no partner linked yet

**Used by:** Almost every page. Always destructure `partnerProfile?.displayName` for partner name.

---

## `ExpenseContext.jsx`

**Hook:** `useExpenses()`

**Provides:**
| Value | Type | Description |
|---|---|---|
| `expenses` | array | All expenses for the couple, sorted date desc |
| `budget` | number \| null | `couples.monthlyBudget` |
| `loading` | boolean | True while fetching |
| `addNew(data)` | async fn | Add expense + refresh list |
| `edit(id, data)` | async fn | Update expense + refresh list |
| `remove(id)` | async fn | Delete expense (optimistic local remove) |
| `refresh()` | async fn | Manual refetch |

**Behavior:**
- Auto-fetches when `userProfile.coupleId` changes
- Fetches both expenses list and couple doc (for budget) in parallel

**Used by:** DashboardPage, AddExpensePage, EditExpensePage, ExpensesPage, AnalyticsPage

---

## `FeatureFlagContext.jsx`

**Hook:** `useFlags()`

**Provides:**
| Value | Type | Description |
|---|---|---|
| `flags` | object | Key-value pairs from `config/features` Firestore doc |

**Behavior:**
- Uses `onSnapshot` — flags update in real time without page reload
- Silently ignores Firestore permission errors (returns empty `{}`)

**Current flags used in code:**
| Flag | Default | Effect |
|---|---|---|
| `enableBudget` | true (if not set) | Hides budget chip on Dashboard + budget card on Insights if `false` |

**Used by:** DashboardPage, AnalyticsPage

---

## Adding a New Context

1. Create `src/contexts/MyContext.jsx` with Provider + hook
2. Wrap in `App.jsx` (respect provider order above)
3. Update this file
