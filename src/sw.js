import { initializeApp }                    from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim }                      from 'workbox-core'

// ─── PWA: activate immediately ───────────────────────────────────────────────
self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ─── Firebase Cloud Messaging (background push) ───────────────────────────────
const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
})

const messaging = getMessaging(app)

onBackgroundMessage(messaging, payload => {
  const { title = 'Karcha 💸', body = '' } = payload.notification ?? {}
  self.registration.showNotification(title, {
    body,
    icon: '/domanga/icon-192.png',
    badge: '/domanga/icon-192.png',
  })
})

// ─── Notification click → focus/open app ─────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      if (wins.length) return wins[0].focus()
      return clients.openWindow('/domanga/')
    })
  )
})
