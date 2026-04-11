# src/ — Context Summary

> Quick orientation for AI agents. Read this before touching any file in `src/`.
> **Keep this updated when major changes are made.**

---

## Entry Files

| File | Purpose |
|---|---|
| `main.jsx` | React entry point. Registers PWA service worker (`virtual:pwa-register`). Forces SW update check on `visibilitychange`. |
| `App.jsx` | Root component. Wraps with `FlagProvider → AuthProvider → ExpenseProvider`. HashRouter with all routes. Listens to foreground FCM messages and shows a toast overlay. |
| `sw.js` | Custom service worker (injectManifest). Workbox precache + FCM background push handler. Opens `/domanga/` on notification click. |
| `index.css` | Global Tailwind base. Sets `karcha-bg` background. |

## Route Map

| Path | Component | Auth Required |
|---|---|---|
| `/` | LoginPage | No |
| `/verify` | OTPPage | No |
| `/setup` | ProfileSetupPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/add` | AddExpensePage | Yes |
| `/edit/:id` | EditExpensePage | Yes |
| `/expenses` | ExpensesPage | Yes |
| `/analytics` | AnalyticsPage | Yes |
| `/settings` | SettingsPage | Yes |
| `/admin` | AdminPage | Yes (+ admin credential gate) |

## Provider Order (outermost → innermost)
```
FlagProvider → AuthProvider → ExpenseProvider → AppRoutes
```

## Directory Map

| Directory | Contents |
|---|---|
| `pages/` | One file per route. See `pages/CONTEXT.md`. |
| `contexts/` | Auth, Expenses, FeatureFlags. See `contexts/CONTEXT.md`. |
| `firebase/` | All Firebase interactions. See `firebase/CONTEXT.md`. |
| `hooks/` | `useCategories`, `useFilteredExpenses`. See `hooks/CONTEXT.md`. |
| `utils/` | `categories.js` (15 built-ins), `formatUtils.js` (INR, dates). See `utils/CONTEXT.md`. |
| `components/common/` | BottomNav, Header, RequireAuth, PageLoader, Spinner. See `components/CONTEXT.md`. |
