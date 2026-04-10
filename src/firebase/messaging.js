import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { app } from './config'
import { updateUser } from './db'

let _messaging = null
function getMsg() {
  if (!_messaging) _messaging = getMessaging(app)
  return _messaging
}

/**
 * Request notification permission, get FCM device token, and save it to Firestore.
 * Returns the token string, or null if permission was denied / unsupported.
 */
export async function subscribePush(userId) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('[FCM] VITE_FIREBASE_VAPID_KEY not set — push disabled')
    return null
  }
  try {
    const swReg = await navigator.serviceWorker.ready
    const token = await getToken(getMsg(), { vapidKey, serviceWorkerRegistration: swReg })
    if (token && userId) {
      await updateUser(userId, { fcmToken: token })
    }
    return token
  } catch (err) {
    console.warn('[FCM] token error:', err)
    return null
  }
}

/**
 * Listen for push messages while the app is in the foreground.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(handler) {
  return onMessage(getMsg(), handler)
}
