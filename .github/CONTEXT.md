# .github/ — Context Summary

> CI/CD automation for Karcha. Currently one workflow.
> **Keep this updated when new workflows or secrets are added.**

---

## Workflows

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
