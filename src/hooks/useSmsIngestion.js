import { useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { parseOCRText } from '../utils/scanParser'

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
 * @param {function} options.onExpenseCreated Called with the saved expense object
 * @param {function} options.onError          Called with error
 */
export function useSmsIngestion({ uid, onExpenseCreated, onError }) {
  const isActive = useRef(false)

  // Pre-filter: only process SMS that look like bank transactions
  const looksLikeTransaction = useCallback((body) => {
    const AMOUNT_RE      = /(?:₹|rs\.?|inr)\s*[\d,]+/i
    const TRANSACTION_RE = /\b(debited|credited|debit|credit|paid|payment|spent|charged|transferred)\b/i
    return AMOUNT_RE.test(body) && TRANSACTION_RE.test(body)
  }, [])

  const saveToFirestore = useCallback(async (smsBody) => {
    if (!uid) return
    const results = parseOCRText(smsBody)
    if (!results.length) return

    try {
      const expense = results[0]
      const docRef = await addDoc(
        collection(db, 'users', uid, 'expenses'),
        { ...expense, source: 'sms', createdAt: serverTimestamp() }
      )
      onExpenseCreated?.({ ...expense, id: docRef.id })
    } catch (err) {
      onError?.(err)
    }
  }, [uid, onExpenseCreated, onError])

  useEffect(() => {
    // Only runs inside the Capacitor native app on Android
    if (!Capacitor.isNativePlatform()) return
    if (Capacitor.getPlatform() !== 'android') return

    // cordova-plugin-sms exposes window.SMS after the Capacitor/Cordova bridge loads
    const tryStart = () => {
      if (!window.SMS) {
        console.warn('[useSmsIngestion] cordova-plugin-sms not available')
        return
      }
      if (isActive.current) return

      window.SMS.startWatch(
        () => { isActive.current = true },
        () => console.error('[useSmsIngestion] Failed to start SMS watch'),
      )
    }

    // The Cordova bridge fires deviceready before plugins are available
    const onDeviceReady = () => tryStart()
    document.addEventListener('deviceready', onDeviceReady)
    tryStart() // also try immediately in case deviceready already fired

    const onSmsArrive = (e) => {
      const body = e?.data?.body || e?.data?.message || ''
      if (body && looksLikeTransaction(body)) {
        saveToFirestore(body)
      }
    }

    document.addEventListener('onSMSArrive', onSmsArrive)

    return () => {
      document.removeEventListener('deviceready', onDeviceReady)
      document.removeEventListener('onSMSArrive', onSmsArrive)
      if (isActive.current && window.SMS) {
        window.SMS.stopWatch(() => { isActive.current = false }, () => {})
      }
    }
  }, [looksLikeTransaction, saveToFirestore])
}
