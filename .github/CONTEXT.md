# .github/ — Context Summary

> CI/CD automation for Kharcha.
> **Keep this updated when new workflows or secrets are added.**

---

## Workflows

### `workflows/build-apk.yml`

**Trigger:** Push to `main` (ignores `.py`/`.md`/`sync-sheets.yml`-only changes) + `workflow_dispatch`

**Two independent jobs (run in parallel):**

1. **`build`** — Android APK
   - Builds web app via `npm run build:capacitor` (base path `/`)
   - `npx cap sync android`, builds debug APK with Gradle (JDK 17)
   - Uploads APK as a workflow artifact (`kharcha-debug-{run_number}`)
   - Publishes/replaces a GitHub Release tagged `latest` with `kharcha.apk` attached
2. **`deploy-web`** — PWA / GitHub Pages
   - Builds web app via `npm run build` (base path `/domanga/` — different from the Capacitor build above, so it's a separate job/build step, not reused)
   - Pushes `dist/` to the `gh-pages` branch via `peaceiris/actions-gh-pages@v4` (GitHub Pages is configured to serve from that branch)
   - Runs `node scripts/tag-deploy.js` afterwards to tag the deploy for rollback — mirrors what `npm run deploy` does locally

**Secrets required (both jobs):**
| Secret | Description |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY` | Firebase web config — CI has no `.env.local`, so these must be set as repo secrets |
| `GITHUB_TOKEN` | Built-in — used for GitHub Releases (`build` job) and pushing to `gh-pages` (`deploy-web` job) |

**Permissions:** Both jobs declare `permissions: contents: write` (required for releases / branch pushes / tag pushes).

### `workflows/daily-nudge.yml`

**Trigger:** Cron `30 17 * * *` (= 23:00 IST daily) + `workflow_dispatch` for manual runs

**What it does:**
1. Checks out repo
2. Installs `firebase-admin` via npm
3. Runs `node scripts/send-nudge.js`

**Secrets required:**
| Secret | Description |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON (base64 or raw) for `firebase-admin` auth |

**Hardcoded env vars:**
```
FIREBASE_PROJECT_ID=karcha-efaa5
```

---

## Scripts

### `scripts/send-nudge.js`

- ESM module (`"type": "module"` in package.json)
- Uses `createRequire(import.meta.url)` to import CJS-only `firebase-admin`
- Reads all docs from `users` Firestore collection
- Collects `fcmToken` field from each user doc
- Sends FCM multicast push notification to all collected tokens
- Message: "Your expenses had a wild day out. Log them before they file for independence. 💸"

**Dependencies:** `firebase-admin` (installed in CI only, not in package.json devDeps)
