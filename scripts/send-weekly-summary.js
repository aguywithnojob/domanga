// Weekly expense summary script — runs via GitHub Actions every Sunday at ~10 PM IST
// Reads each couple's expenses from the current week, sends FCM push to all couple members.
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

function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN')
}

async function main() {
  // Week range: last 7 days in IST
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get all couples
  const couplesSnap = await db.collection('couples').get()
  if (couplesSnap.empty) {
    console.log('No couples found.')
    return
  }

  let totalSent = 0
  let totalFailed = 0

  for (const coupleDoc of couplesSnap.docs) {
    const coupleId = coupleDoc.id

    // Fetch this week's expenses for the couple
    const expSnap = await db.collection('expenses')
      .where('coupleId', '==', coupleId)
      .where('date', '>=', weekAgo.toISOString().slice(0, 10))
      .get()

    const totalAmount = expSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)
    const txnCount    = expSnap.docs.length

    // Get FCM tokens for all members of this couple
    const usersSnap = await db.collection('users')
      .where('coupleId', '==', coupleId)
      .get()

    const tokens = usersSnap.docs
      .map(d => d.data().fcmToken)
      .filter(t => typeof t === 'string' && t.length > 10)

    if (!tokens.length) {
      console.log(`Couple ${coupleId}: no FCM tokens, skipping.`)
      continue
    }

    let body
    if (txnCount === 0) {
      body = "No expenses logged this week. Fresh start? 😇"
    } else {
      body = `${txnCount} expense${txnCount > 1 ? 's' : ''} · ${formatINR(totalAmount)} spent this week`
    }

    const response = await fcm.sendEachForMulticast({
      tokens,
      notification: {
        title: '📊 Weekly Kharcha Summary',
        body,
      },
      webpush: {
        notification: {
          icon: 'https://aguywithnojob.github.io/domanga/icon-192.png',
        },
      },
    })

    totalSent   += response.successCount
    totalFailed += response.failureCount
    console.log(`Couple ${coupleId}: ${txnCount} txns, ${formatINR(totalAmount)} | Sent: ${response.successCount} | Failed: ${response.failureCount}`)
  }

  console.log(`\nDone. Total sent: ${totalSent} | Total failed: ${totalFailed}`)
}

main().catch(err => {
  console.error('Weekly summary script error:', err)
  process.exit(1)
})
