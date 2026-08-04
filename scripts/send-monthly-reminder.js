// Monthly budget reset reminder — runs via GitHub Actions on 1st of every month
// Sends a push notification to all users to set their budget for the new month.
// Required env vars: FIREBASE_SERVICE_ACCOUNT_FILE or FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID

import { createRequire } from 'module'
import { readFileSync } from 'fs'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

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
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  process.env.FIREBASE_PROJECT_ID,
})

const db  = admin.firestore()
const fcm = admin.messaging()

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

async function main() {
  const monthName = MONTH_NAMES[new Date().getMonth()]

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
      title: `🗓️ ${monthName} is here!`,
      body: "New month, fresh slate. Set your budget in Kharcha 💸",
    },
    webpush: {
      notification: {
        icon: 'https://aguywithnojob.github.io/domanga/icon-192.png',
      },
    },
  })

  console.log(`Sent: ${response.successCount} | Failed: ${response.failureCount}`)
  response.responses.forEach((r, i) => {
    if (!r.success) console.warn(`Token[${i}] failed:`, r.error?.code)
  })
}

main().catch(err => {
  console.error('Monthly reminder script error:', err)
  process.exit(1)
})
