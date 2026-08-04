// Daily nudge script — runs via GitHub Actions at 23:00 IST
// Sends FCM push to all users who have granted notification permission
// Required env vars:

import { createRequire } from 'module'
import { readFileSync } from 'fs'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

// Prefer file-based secret (avoids JSON newline corruption in env vars)
const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_FILE
  ? readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf-8').trim()
  : process.env.FIREBASE_SERVICE_ACCOUNT

if (!rawJson) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT secret is not set.')
  process.exit(1)
}

let serviceAccount
try {
  serviceAccount = JSON.parse(rawJson)
} catch {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT is not valid JSON.')
  console.error('  Length:', rawJson.length, '| First 40 chars:', rawJson.slice(0, 40))
  console.error('  Tip: delete & re-add the secret, pasting the raw .json file content.')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  process.env.FIREBASE_PROJECT_ID,
})

const db  = admin.firestore()
const fcm = admin.messaging()

async function main() {
  const snap = await db.collection('users').get()

  const tokens = snap.docs
    .map(d => d.data().fcmToken)
    .filter(t => typeof t === 'string' && t.length > 10)

  if (!tokens.length) {
    console.log('No FCM tokens found — no pushes sent.')
    return
  }

  const response = await fcm.sendEachForMulticast({
    tokens,
    notification: {
      title: 'Kharcha 💸',
      body:  "Today’s expenses won’t log themselves (sadly)",
    },
    webpush: {
      notification: {
        icon: 'https://aguywithnojob.github.io/domanga/icon-192.png',
      },
    },
  })

  console.log(`Sent: ${response.successCount} | Failed: ${response.failureCount}`)

  // Log failed tokens (stale tokens to be cleaned up if needed)
  response.responses.forEach((r, i) => {
    if (!r.success) console.warn(`Token[${i}] failed:`, r.error?.code)
  })
}

main().catch(err => {
  console.error('Nudge script error:', err)
  process.exit(1)
})
