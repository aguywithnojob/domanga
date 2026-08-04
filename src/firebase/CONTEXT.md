# src/firebase/ — Context Summary

> All Firebase interactions live here. Read before touching any firebase file.
> **Keep this updated when functions are added or Firestore collections change.**

---

## Files Overview

| File | Purpose |
|---|---|
| `config.js` | Firebase app init. Exports `app`, `auth`, `db`. Throws if env vars missing. Enables Firestore offline persistence. |
| `auth.js` | Google Sign-In (primary) + Phone OTP (flag-gated secondary) — send + verify. Rate limit check. reCAPTCHA setup. |
| `db.js` | All Firestore CRUD — users, couples, expenses, budget, OTP limits. Real-time `subscribeExpenses`. |
| `admin.js` | Admin-only Firestore ops — feature flags, categories, admin auth. |
| `messaging.js` | FCM push — get token, save to user doc, listen for foreground messages. |

---

## `config.js`
- **Exports:** `app`, `auth`, `db`
- **Source:** `import.meta.env.VITE_FIREBASE_*`
- **Note:** Throws hard error if `VITE_FIREBASE_API_KEY` or `VITE_FIREBASE_PROJECT_ID` missing.
- **Offline:** Uses `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager`. Writes queued in IndexedDB when offline, synced on reconnect.

---

## `auth.js`
- **Exports:** `googleSignIn()`, `setupRecaptcha(containerId)`, `sendOTP(phone, containerId)`, `verifyOTP(otp)`, `logout()`
- **`googleSignIn()`:** Web uses `signInWithPopup` + Firebase's `GoogleAuthProvider` (no extra config beyond enabling Google in Firebase console). Native (Capacitor) uses `@codetrix-studio/capacitor-google-auth` to get a native idToken, then `signInWithCredential` so the session lands in the same `auth` instance. Native requires `serverClientId` (Firebase's auto-created "Web client ID") set in `capacitor.config.json` under `plugins.GoogleAuth`.
- **Email/password auth removed** — Google Sign-In is now the primary method. Phone OTP remains as an always-available secondary method in `LoginPage` (not feature-flag gated — unauthenticated users can't reliably read feature flags before signing in, so gating it would risk hiding it for first-time users).
- **Calls:** `checkOtpRateLimit` + `recordOtpSend` from `db.js`
- **Firestore read:** `otpLimits/{phoneDigits}`
- **Notes:** Phone must be in `+91XXXXXXXXXX` format. `confirmationResult` stored on `window`.

---

## `db.js`

### User functions
| Function | Firestore | Notes |
|---|---|---|
| `getUser(uid)` | read `users/{uid}` | Returns null if not found |
| `createUser(uid, data)` | write `users/{uid}` | Sets coupleId/partnerId to null |
| `updateUser(uid, data)` | write `users/{uid}` | Partial update |

### Couple functions
| Function | Firestore | Notes |
|---|---|---|
| `createCouple(userId)` | write `couples` | Generates random 6-digit inviteCode |
| `getCouple(coupleId)` | read `couples/{coupleId}` | |
| `getCoupleByInviteCode(code)` | read `couples` where inviteCode==code | Returns first match |
| `joinCouple(userId, inviteCode)` | write `couples`, write `users` (both) | Updates member list + cross-updates partnerId |

### Expense functions
| Function | Firestore | Notes |
|---|---|---|
| `addExpense(coupleId, paidBy, data)` | write `expenses` | Uses `Timestamp.now()` (not `serverTimestamp`) so write resolves immediately offline |
| `getExpenses(coupleId)` | read `expenses` where coupleId== | Sorted by createdAt desc |
| `subscribeExpenses(coupleId, onChange)` | onSnapshot `expenses` where coupleId== | Real-time listener; returns unsubscribe fn. Used by ExpenseContext. |
| `updateExpense(id, data)` | write `expenses/{id}` | Partial update |
| `deleteExpense(id)` | delete `expenses/{id}` | |

### Budget
| Function | Firestore | Notes |
|---|---|---|
| `setBudget(coupleId, amount)` | write `couples/{coupleId}` | Sets `monthlyBudget` field |
| `setCategoryBudgets(coupleId, budgets)` | write `couples/{coupleId}` | Sets `categoryBudgets` map `{ [catId]: amount }` |

### OTP rate limiting
| Function | Firestore | Notes |
|---|---|---|
| `checkOtpRateLimit(phone)` | read `otpLimits/{phoneDigits}` | Throws if > 5 in 24h window |
| `recordOtpSend(phone)` | write `otpLimits/{phoneDigits}` | Creates or increments count |

---

## `admin.js`
- **Exports:** `getFeatureFlags()`, `setFeatureFlag(name, value)`, `getAdminCategories()`, `saveAdminCategories(data)`, `verifyAdminCredentials(username, password)`, `getKeywordRules()`, `saveKeywordRules(rules)`
- **Firestore read:** `config/features`, `config/categories`, `config/adminAuth`, `config/keywords`
- **Firestore write:** `config/features`, `config/categories`, `config/keywords`
- **`getKeywordRules()`:** Reads `config/keywords.rules[]` → returns `Array<{keyword, categoryId}>`; returns `[]` if doc missing
- **`saveKeywordRules(rules)`:** Writes `{ rules }` to `config/keywords`
- **Auth method:** SHA-256 hash via `crypto.subtle` — compares against `config/adminAuth.passwordHash`
- **Admin credentials:** `Admin` / `Admin` (SHA-256 stored in Firestore)

### Haul functions (`db.js`)
| Function | Firestore | Notes |
|---|---|---|
| `addHaulItem(coupleId, addedBy, text)` | write `haulItems` | Sets `done: false`, `doneAt: null` |
| `markHaulDone(id, done)` | update `haulItems/{id}` | Sets `doneAt: Timestamp.now()` when done |
| `deleteHaulItem(id)` | delete `haulItems/{id}` | |
| `subscribeHaulItems(coupleId, onChange)` | onSnapshot `haulItems` where coupleId== | Sorts pending first, then done; silently deletes items done >24h; returns unsubscribe fn |

---

## `messaging.js`
- **Exports:** `subscribePush(userId)`, `onForegroundMessage(handler)`
- **Firestore write:** `users/{userId}.fcmToken`
- **Requires:** `VITE_FIREBASE_VAPID_KEY` env var + browser Notification + ServiceWorker support
- **Guards:** Returns null silently if unsupported or VAPID key missing

---

## Firestore Collections Quick Reference

| Collection | Written by | Read by |
|---|---|---|
| `users/{uid}` | `db.js`, `messaging.js` | `AuthContext`, `db.js`, `send-nudge.js` |
| `couples/{coupleId}` | `db.js` | `ExpenseContext`, `SettingsPage` |
| `expenses/{id}` | `db.js` | `ExpenseContext` |
| `otpLimits/{phone}` | `db.js` | `auth.js` |
| `config/keywords` | `admin.js` | `ScanPage` (via `getKeywordRules`); `AdminPage` (CRUD) |
| `config/features` | `admin.js` | `FeatureFlagContext` |
| `config/categories` | `admin.js` | `useCategories` hook |
| `config/adminAuth` | (set manually) | `admin.js` |
| `haulItems/{id}` | `db.js` | `HaulPage` |

---

## Environment Variables Required

| Var | Used in |
|---|---|
| `VITE_FIREBASE_API_KEY` | `config.js` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `config.js` |
| `VITE_FIREBASE_PROJECT_ID` | `config.js`, `sw.js` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `config.js` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `config.js` |
| `VITE_FIREBASE_APP_ID` | `config.js` |
| `VITE_FIREBASE_VAPID_KEY` | `messaging.js` |
