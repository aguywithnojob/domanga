# src/components/common/ — Context Summary

> Shared UI building blocks used across pages. No Firestore writes.
> **Keep this updated when guard logic or nav items change.**

---

## `BottomNav.jsx`

5-tab fixed bottom navigation bar.

| Tab | Route | Notes |
|---|---|---|
| Home | `/dashboard` | |
| Expenses | `/expenses` | |
| Spend | `/add` | FAB — elevated green pill, `-mt-5` |
| Insights | `/analytics` | |
| Settings | `/settings` | |

- Active tab: primary-600 text + dot indicator
- FAB active: `accent-500` bg; inactive: `primary-600` bg
- `pb-safe` for iOS home-bar clearance

---

## `Header.jsx`

Props: `{ title, backTo?, action? }`

- `backTo`: shows `←` button; calls `navigate(backTo)` on click
- `action`: renders arbitrary JSX in the right slot (e.g. icon button)
- Sticky top, `z-40`, white bg, bottom border

---

## `RequireAuth.jsx`

Route guard — wraps protected routes via `<Outlet />`.

**Guard chain (in order):**
1. Auth loading → `<PageLoader />`
2. No `firebaseUser` → redirect `/`
3. No `userProfile.displayName` → redirect `/setup`
4. No `userProfile.coupleId` → redirect `/setup`
5. No `userProfile.phone` → redirect `/setup` (mobile number is mandatory — Google sign-in doesn't provide one, so `ProfileSetupPage` collects it)
6. All checks pass → `<Outlet />`

---

## `PageLoader.jsx`

Full-screen centred spinner shown during auth loading.

---

## `Spinner.jsx`

Inline spinner. Props: `{ size?: 'sm' | 'md' | 'lg' }` (default: `md`).
