import { useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { parseOCRText } from '../utils/scanParser'
import { getCategoryMeta } from '../utils/categories'

// Play a short two-tone chime via Web Audio API (no audio file needed)
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const times = [0, 0.15]
    const freqs  = [880, 1100]
    times.forEach((t, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freqs[i]
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.3)
    })
  } catch { /* audio not supported — silently skip */ }
}

/**
 * useSmsIngestion
 *
 * Listens for incoming SMS on Android (Capacitor native only) and
 * writes transaction SMS directly to Firestore — no Cloud Function needed.
 * Completely free on Firebase Spark plan.
 *
 * Setup required:
 *   npm install cordova-plugin-sms
 *   npx cap sync android
 *   Add to android/app/src/main/AndroidManifest.xml:
 *     <uses-permission android:name="android.permission.RECEIVE_SMS"/>
 *     <uses-permission android:name="android.permission.READ_SMS"/>
 *
 * @param {object} options
 * @param {string}   options.uid              Firebase user UID
 * @param {string}   options.coupleId         Couple ID (expenses are couple-scoped)
 * @param {function} options.onExpenseCreated Called with the saved expense object
 * @param {function} options.onError          Called with error
 */
export function useSmsIngestion({ uid, coupleId, onExpenseCreated, onError }) {
  const isActive = useRef(false)

  // Pre-filter: only process SMS that look like bank transactions
  const looksLikeTransaction = useCallback((body) => {
    const AMOUNT_RE      = /(?:₹|rs\.?\s*|inr)\s*[\d,]+/i
    const TRANSACTION_RE = /\b(debited|credited|debit|credit|paid|payment|spent|charged|transferred)\b/i
    return AMOUNT_RE.test(body) && TRANSACTION_RE.test(body)
  }, [])

  const saveToFirestore = useCallback(async (smsBody) => {
    if (!uid || !coupleId) return   // not linked to a couple yet — skip
    const results = parseOCRText(smsBody)
    if (!results.length) return

    try {
      const parsed = results[0]
      const docRef = await addDoc(
        collection(db, 'expenses'),
        {
          coupleId,
          paidBy:      uid,
          amount:      parsed.amount,
          category:    parsed.categoryId,
          description: parsed.description || '',
          date:        Timestamp.fromDate(new Date(parsed.date)),
          createdAt:   Timestamp.now(),
          source:      'sms',
        }
      )

      const meta = getCategoryMeta(parsed.categoryId)
      const notifBody = `${meta.emoji} ₹${parsed.amount} · ${meta.label}${
        parsed.description ? ` · ${parsed.description}` : ''
      }`

      // Background notification with sound channel
      if (Capacitor.isNativePlatform()) {
        try {
          await LocalNotifications.requestPermissions()
          // Create a channel with sound (Android 8+)
          await LocalNotifications.createChannel({
            id:          'sms-expense',
            name:        'SMS Expenses',
            description: 'Notifications when a bank SMS is auto-saved as expense',
            importance:  4,      // HIGH — makes sound + pops up
            sound:       'default',
            vibration:   true,
          }).catch(() => {})     // channel may already exist — ignore
          await LocalNotifications.schedule({
            notifications: [{
              id:        Date.now(),
              title:     'Expense auto-saved',
              body:      notifBody,
              channelId: 'sms-expense',
              schedule:  { at: new Date(Date.now() + 100) },
              smallIcon: 'ic_stat_icon_config_sample',
            }],
          })
        } catch { /* silent — notification is bonus, not critical */ }
      }

      // Foreground chime
      playChime()

      onExpenseCreated?.({ ...parsed, id: docRef.id, notifBody })
    } catch (err) {
      onError?.(err)
    }
  }, [uid, coupleId, onExpenseCreated, onError])

  useEffect(() => {
    // Only runs inside the Capacitor native app on Android
    if (!Capacitor.isNativePlatform()) return
    if (Capacitor.getPlatform() !== 'android') return

    // Request notification permission + create sound channel on mount
    LocalNotifications.requestPermissions().then(() =>
      LocalNotifications.createChannel({
        id:          'sms-expense',
        name:        'SMS Expenses',
        description: 'Notifications when a bank SMS is auto-saved as expense',
        importance:  4,
        sound:       'default',
        vibration:   true,
      }).catch(() => {})
    ).catch(() => {})

    // cordova-plugin-sms exposes window.SMS after the Capacitor/Cordova bridge loads
    const tryStart = () => {
      if (!window.SMS) {
        onError?.(new Error('[SMS] cordova-plugin-sms not available — window.SMS is undefined'))
        return
      }
      if (isActive.current) return

      // startWatch triggers the Android SMS permission dialog on first call
      window.SMS.startWatch(
        () => { isActive.current = true },
        () => onError?.(new Error('[SMS] startWatch failed — SMS permission may have been denied')),
      )
    }

    // Retry every 500ms for up to 5s in case bridge loads slowly
    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      if (window.SMS || attempts >= 10) {
        clearInterval(interval)
        tryStart()
      }
    }, 500)

    // Also listen for deviceready as a fallback
    const onDeviceReady = () => { clearInterval(interval); tryStart() }
    document.addEventListener('deviceready', onDeviceReady)
    tryStart() // try immediately too

    const onSmsArrive = (e) => {
      const body = e?.data?.body || e?.data?.message || ''
      if (body && looksLikeTransaction(body)) {
        saveToFirestore(body)
      }
    }

    document.addEventListener('onSMSArrive', onSmsArrive)

    return () => {
      clearInterval(interval)
      document.removeEventListener('deviceready', onDeviceReady)
      document.removeEventListener('onSMSArrive', onSmsArrive)
      if (isActive.current && window.SMS) {
        window.SMS.stopWatch(() => { isActive.current = false }, () => {})
      }
    }
  }, [looksLikeTransaction, saveToFirestore])
}
