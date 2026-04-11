# src/pages/ — Context Summary

> Quick reference for all page components. Read before editing any page.
> **Keep this updated when pages are added, removed, or significantly changed.**

---

## Public Pages (no auth required)

### `LoginPage.jsx`
- **Route:** `/`
- **Purpose:** Phone number input, sends OTP
- **Key state:** `phone`, `error`, `loading`
- **Calls:** `checkOtpRateLimit`, `sendOTP` (from `firebase/auth.js`)
- **Navigates to:** `/verify` on success
- **Notes:** Formats phone → `+91{10digits}`. Has invisible reCAPTCHA container div.

### `OTPPage.jsx`
- **Route:** `/verify`
- **Purpose:** 6-digit OTP verification
- **Key state:** `otp[]` (6 inputs), `error`, `loading`, `resendTimer`
- **Calls:** `verifyOTP`, `refreshProfile`
- **Navigates to:** `/setup` (no profile/couple) or `/dashboard`
- **Notes:** Auto-submits on 6th digit. Backspace moves to prev input. Resend after 30s.

### `ProfileSetupPage.jsx`
- **Route:** `/setup`
- **Purpose:** Create name + create couple OR join partner's couple
- **Key state:** `name`, `mode` (create/join), `code`, `inviteCode`
- **Calls:** `createUser`, `createCouple`, `joinCouple`, `refreshProfile`
- **Firestore write:** `users`, `couples`
- **Notes:** Idempotent — checks `getUser` before `createUser`. Shows invite code after creating couple.

---

## Protected Pages (RequireAuth: must have firebaseUser + displayName + coupleId)

### `DashboardPage.jsx`
- **Route:** `/dashboard`
- **Purpose:** Home screen — month total, stats, recent expenses
- **Key state:** `tab` (all/me/partner), `isOnline`, `newExpenseIds` (Set)
- **Consumes:** `useAuth()`, `useExpenses()`, `useFlags()`
- **Displays:**
  - Header with month total + You/Partner split bar — turns **grey** with wifi-off watermark when offline
  - 3-col stat grid: Budget chip · **Today** (today's total spend) · Week sparkline
  - Recent expenses tabbed by All / You / [PartnerName]
  - New expense rows flash green → white for 2s when added via `onSnapshot`
- **Feature flags:** `enableBudget` hides budget chip if `false`
- **Partner name:** Uses `partnerProfile.displayName` from AuthContext

### `AddExpensePage.jsx`
- **Route:** `/add`
- **Purpose:** Log a new expense
- **Key state:** `amount`, `category`, `description`, `date`, `loading`
- **Consumes:** `useExpenses()`, `useCategories()`
- **Firestore write:** `expenses` via `addNew()`
- **Notes:** Category is native `<select>`. Amount validated > 0. Uses fire-and-forget `addNew()` — navigates to dashboard immediately without waiting for server.

### `EditExpensePage.jsx`
- **Route:** `/edit/:id`
- **Purpose:** Edit an existing expense
- **Key state:** Same as Add + ownership guard
- **Consumes:** `useAuth()`, `useExpenses()`, `useCategories()`
- **Firestore write:** `expenses` via `edit()`
- **Notes:** Only owner (paidBy == userId) can edit. Shows error page otherwise.

### `ExpensesPage.jsx`
- **Route:** `/expenses`
- **Purpose:** Filterable expense history list
- **Key state:** `fromDate`, `toDate`, `catFilter`, `personFilter`, `deleting`
- **Consumes:** `useAuth()`, `useExpenses()`
- **Firestore write:** `expenses` via `remove()` for delete
- **Filters:** Date range, category, person (all/me/[partnerName])
- **Notes:** Only owner can edit/delete. Person filter uses `partnerProfile.displayName`.

### `AnalyticsPage.jsx`
- **Route:** `/analytics`
- **Purpose:** Insights — spending breakdown + charts
- **Key state:** `preset` (month/week/last/custom), `fromDate`, `toDate`
- **Consumes:** `useAuth()`, `useExpenses()`, `useFlags()`
- **Charts:**
  - Dual-line budget sparkline: **blue** (`#3b82f6`) = You, **orange** (`#f97316`) = Partner — fixed for both devices
  - Category breakdown (horizontal list, sorted desc)
  - You vs [PartnerName] bar chart (Recharts)
- **Feature flags:** `enableBudget` hides budget card
- **Notes:** Budget insight always uses current calendar month, regardless of preset.

### `SettingsPage.jsx`
- **Route:** `/settings`
- **Purpose:** User preferences + couple management
- **Key state:** `couple`, `budgetInput`, `budgetSaved`, `notifStatus`, `installPrompt`, `isInstalled`
- **Consumes:** `useAuth()`
- **Firestore read:** `couples/{coupleId}`
- **Firestore write:** `couples` (setBudget), `users` (fcmToken via subscribePush)
- **Features:** Profile card + inline Sign out, budget input, notification enable, invite code copy, PWA install button, Admin link, app version footer.
- **Offline fix:** `subscribePush` called on mount if `Notification.permission === 'granted'` — ensures FCM token saved even if user previously accepted without button tap.
- **Install prompt:** Captured in `main.jsx` via `window.__installPrompt` before React mounts to avoid missing early `beforeinstallprompt` event.

### `AdminPage.jsx`
- **Route:** `/admin`
- **Purpose:** Admin-only panel — feature flags + category management
- **Auth gate:** `sessionStorage.adminAuthed` (set after SHA-256 password verify)
- **Sub-components:** `AdminLogin` (login gate), `AdminPanel` (main panel)
- **Firestore read:** `config/features`, `config/categories`, `config/adminAuth`
- **Firestore write:** `config/features`, `config/categories`
- **Features:** Toggle feature flags, enable/disable categories, add/delete custom categories.
- **Admin credentials:** Username `Admin`, password `Admin` (SHA-256 stored in Firestore `config/adminAuth`).
- **Toggle bug fix:** Knob uses `left-[22px]`/`left-0.5` CSS positioning (not `translate`) for mobile WebKit reliability.

### `NotificationsPage.jsx`
- **Route:** `/notifications`
- **Purpose:** In-app notification inbox — last 5 push notifications
- **Key state:** Managed by `NotifContext` (localStorage-backed)
- **Features:** Shows last 5 notifications with relative timestamps, "Clear all" button, marks all as read on mount.
- **Access:** Bell icon (🔔) in Header — red dot appears when unread count > 0.
