// Daily nudge script — runs via GitHub Actions at 23:00 IST
// Sends FCM push to all users who have granted notification permission
// Required env vars:

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT secret is not set. Add it in GitHub repo → Settings → Secrets and variables → Actions.')
  process.exit(1)
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

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
      title: 'Karcha 💸',
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
