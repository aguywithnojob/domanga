# src/pages/ — Context Summary

> Quick reference for all page components. Read before editing any page.
> **Keep this updated when pages are added, removed, or significantly changed.**

---

## Public Pages (no auth required)

### `LoginPage.jsx`
- **Route:** `/`
- **Purpose:** Sign in — Google is the primary/default method; Phone OTP is always available as a secondary tab
- **Key state:** `tab` (google/phone), `phone`, `error`, `loading`
- **Calls:** `googleSignIn()`, `sendOTP()` (from `firebase/auth.js`), `getUser`, `refreshProfile`
- **Navigates to:** `/setup` (missing displayName/coupleId/phone) or `/dashboard` after Google sign-in; `/verify` after sending OTP
- **Notes:** Email/password auth was removed in favor of Google. Phone OTP is not feature-flag gated — first-time users are unauthenticated, so they may never receive real feature flag data (Firestore reads of `config/features` can require auth), which would incorrectly hide the tab. Phone formats → `+91{10digits}`. Has invisible reCAPTCHA container div.

### `OTPPage.jsx`
- **Route:** `/verify`
- **Purpose:** 6-digit OTP verification
- **Key state:** `otp[]` (6 inputs), `error`, `loading`, `resendTimer`
- **Calls:** `verifyOTP`, `refreshProfile`
- **Navigates to:** `/setup` (no profile/couple) or `/dashboard`
- **Notes:** Auto-submits on 6th digit. Backspace moves to prev input. Resend after 30s.

### `ProfileSetupPage.jsx`
- **Route:** `/setup`
- **Purpose:** Create name + create couple OR join partner's couple. Also collects a **mandatory mobile number** when the sign-in method didn't provide one (e.g. Google) — required going forward for all accounts.
- **Key state:** `name`, `phone`, `mode` (create/join), `code`, `inviteCode`, `existingProfile`, `profileLoaded`
- **Calls:** `getUser`, `createUser`, `updateUser`, `createCouple`, `joinCouple`, `refreshProfile`
- **Firestore write:** `users`, `couples`
- **Derived:** `phoneRequired` = true when neither `firebaseUser.phoneNumber` nor the stored profile has a phone. `onlyNeedsPhone` = true when displayName + coupleId already exist but phone is still missing (renders a compact phone-only screen instead of the full form).
- **Notes:** Idempotent — loads existing profile via `getUser` on mount (shows `<PageLoader/>` until loaded) instead of re-fetching only inside `handleSubmit`. Shows invite code after creating couple.

---

## Protected Pages (RequireAuth: must have firebaseUser + displayName + coupleId)

### `DashboardPage.jsx`
- **Route:** `/dashboard`
- **Purpose:** Home screen — month total, stats, recent expenses
- **Key state:** `tab` (all/me/partner), `isOnline`, `newExpenseIds` (Set), `selected`, `deleting`
- **Consumes:** `useAuth()`, `useExpenses()`, `useFlags()`
- **Displays:**
  - Header: greeting + **⚙️ gear button** (top-right, navigates to `/settings`) + month total + You/Partner split bar — turns **grey** with wifi-off watermark when offline
  - 3-col stat grid: Budget chip · **Today** (today's total spend) · Week sparkline
  - Recent expenses tabbed by All / You / [PartnerName] — tapping a row opens `ExpenseDetailSheet`
  - New expense rows flash green → white for 2s when added via `onSnapshot`
- **Feature flags:** `enableBudget` hides budget chip if `false`
- **Partner name:** Uses `partnerProfile.displayName` from AuthContext

### `AddExpensePage.jsx`
- **Route:** `/add`
- **Purpose:** Log a new expense
- **Key state:** `amount`, `category`, `description`, `date`, `loading`
- **Consumes:** `useExpenses()`, `useCategories()`
- **Firestore write:** `expenses` via `addNew()`
- **Notes:** Category is native `<select>` powered by `useCategories()` (real-time, includes custom categories). Amount validated > 0. Awaits `addNew()` before navigating to dashboard.

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
- **Key state:** `fromDate`, `toDate`, `catFilter`, `personFilter`, `deleting`, `selected` (open sheet)
- **Consumes:** `useAuth()`, `useExpenses()`
- **Filters:** Date range, category, person (all/me/[partnerName])
- **Detail sheet:** Tapping any row opens `ExpenseDetailSheet` (slide-up bottom sheet)
  - Shows: category, amount, date, note, paid-by badge
  - Own expenses: Edit + Delete buttons inside sheet
  - Partner's expenses: read-only view, no actions
  - Backdrop tap or ✕ closes sheet
- **Notes:** Inline edit/delete row buttons removed — actions moved into detail sheet. Person filter uses `partnerProfile.displayName`.

### `AnalyticsPage.jsx`
- **Route:** `/analytics`
- **Purpose:** Insights — spending breakdown + charts
- **Key state:** `preset` (month/week/last/custom), `fromDate`, `toDate`
- **Consumes:** `useAuth()`, `useExpenses()`, `useFlags()`
- **Charts:**
  - Dual-line budget sparkline: **blue** (`#3b82f6`) = You, **orange** (`#f97316`) = Partner — fixed for both devices
  - Category breakdown (horizontal list, sorted desc) — when `enableBudget` flag is on and a category budget is set, shows `₹spent / ₹budget` with budget-relative progress bar (red if over)
  - You vs [PartnerName] bar chart (Recharts)
- **Feature flags:** `enableBudget` — when `true`, category breakdown shows per-category budget bars
- **Notes:** Budget insight always uses current calendar month, regardless of preset.

### `SettingsPage.jsx`
- **Route:** `/settings`
- **Purpose:** User preferences + couple management
- **Key state:** `couple`, `budgetInput`, `budgetSaved`, `notifStatus`, `installPrompt`, `isInstalled`
- **Consumes:** `useAuth()`
- **Firestore read:** `couples/{coupleId}`
- **Firestore write:** `couples` (setBudget), `users` (fcmToken via subscribePush)
- **Feature flags:** `enableBudget` — when `true`, shows Category Budgets link
- **Notes:** Profile card + inline Sign out, monthly budget input, notification enable, invite code copy, PWA install button, Category Budgets link (flag-gated), Scan link (flag-gated), Admin link, app version footer.
- **Offline fix:** `subscribePush` called on mount if `Notification.permission === 'granted'` — ensures FCM token saved even if user previously accepted without button tap.
- **Install prompt:** Captured in `main.jsx` via `window.__installPrompt` before React mounts to avoid missing early `beforeinstallprompt` event.
- **Access:** Reachable via the ⚙️ gear icon button at the top-right of DashboardPage header (no longer in BottomNav).

### `CategoryBudgetPage.jsx`
- **Route:** `/category-budgets`
- **Purpose:** Set per-category monthly spend limits
- **Key state:** `existingBudgets` (from Firestore), `inputs` (map of categoryId → string), `loading`, `saving`, `saved`
- **Consumes:** `useAuth()`, `useFlags()`, `useCategories()`
- **Firestore read:** `couples/{coupleId}` via `getCouple` (pre-fills existing values)
- **Firestore write:** `couples/{coupleId}.categoryBudgets` via `setCategoryBudgets`
- **Feature flag:** Redirects to `/settings` if `enableBudget` is `false`
- **Notes:** Uses `useCategories()` (real-time) so custom categories added via Admin panel appear here automatically. Two `useEffect`s — one loads saved budgets, one re-initialises inputs when categories or budgets change.
- **Access:** Linked from SettingsPage only when `enableBudget` flag is `true`

### `AdminPage.jsx`
- **Route:** `/admin`
- **Purpose:** Admin-only panel — feature flags, categories, scan keyword rules
- **Auth gate:** `sessionStorage.adminAuthed` (set after SHA-256 password verify)
- **Sub-components:** `AdminLogin` (login gate), `Section` (collapsible accordion), `AdminPanel` (main panel)
- **Firestore read:** `config/features`, `config/categories`, `config/keywords`, `config/adminAuth`
- **Firestore write:** `config/features`, `config/categories`, `config/keywords`
- **Sections (collapsible):**
  - 🚩 Feature Flags — toggle/add flags
  - 🏷️ Categories — enable/disable/add custom
  - 🔍 Scan Keyword Rules — CRUD for OCR merchant→category mappings (overrides built-in defaults)
- **Admin credentials:** Username `Admin`, password `Admin` (SHA-256 stored in Firestore `config/adminAuth`).
- **Toggle bug fix:** Knob uses `left-[22px]`/`left-0.5` CSS positioning (not `translate`) for mobile WebKit reliability.

### `ScanPage.jsx`
- **Route:** `/scan`
- **Purpose:** OCR scan of transaction screenshots → review → bulk add expenses
- **Feature flag:** Renders locked screen if `enablescan` is `false`
- **Flow:** Upload image → Tesseract.js OCR (browser, offline) → `parseOCRText()` → review list → `addNew()` for each selected item
- **Key state:** `step` (0=upload 1=scanning 2=review 3=done), `items[]`, `progress`, `saving`
- **Sub-components:** `StepBar`, `ReviewRow` (inline edit: amount, date, category, note; toggle skip)
- **Consumes:** `useExpenses()`, `useFlags()`, `getKeywordRules()`, `parseOCRText()`, `getCategoryMeta()`
- **Notes:** Fully offline OCR — no API key or server. Keyword rules fetched from Firestore for custom matching. Each item is independently editable and skippable before saving.

### `NotificationsPage.jsx`
- **Route:** `/notifications`
- **Purpose:** In-app notification inbox — last 5 push notifications
- **Key state:** Managed by `NotifContext` (localStorage-backed)
- **Features:** Shows last 5 notifications with relative timestamps, "Clear all" button, marks all as read on mount.
- **Access:** Bell icon (🔔) in Header — red dot appears when unread count > 0.

### `HaulPage.jsx`
- **Route:** `/haul`
- **Purpose:** Shared couple shopping/needs list — add items, mark picked up, delete
- **Key state:** `items[]`, `loading`, `text` (new item input), `adding`
- **Consumes:** `useAuth()`, `subscribeHaulItems()`, `addHaulItem()`, `markHaulDone()`, `deleteHaulItem()` from `db.js`
- **Firestore:** `haulItems` collection; real-time via `subscribeHaulItems`
- **Flow:** Type item → Add → appears in **Need to pick up** section → tap circle to mark done → moves to **Picked up** section with 24h countdown → auto-deleted after 24h
- **Auto-cleanup:** `subscribeHaulItems` filters and silently deletes items where `done && doneAt` age > 24h on every snapshot
- **Access:** 🛒 Haul tab in BottomNav (replaced Settings)
