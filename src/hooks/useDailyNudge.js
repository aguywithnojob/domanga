import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

// Stable ID so we can detect if it's already scheduled and avoid duplicates
const NUDGE_NOTIF_ID = 1001

/**
 * Schedules a daily "log your expenses" reminder at 10 PM on Android.
 * Uses LocalNotifications repeating schedule — no server or pipeline needed.
 * Only schedules once; subsequent app opens are no-ops (checks getPending).
 *
 * @param {boolean} enabled  Pass false when user is not logged in
 */
export function useDailyNudge(enabled) {
  useEffect(() => {
    if (!enabled) return
    if (!Capacitor.isNativePlatform()) return
    if (Capacitor.getPlatform() !== 'android') return

    async function scheduleIfNeeded() {
      try {
        // Don't re-schedule if already pending
        const { notifications } = await LocalNotifications.getPending()
        if (notifications.some(n => n.id === NUDGE_NOTIF_ID)) return

        await LocalNotifications.schedule({
          notifications: [{
            id:        NUDGE_NOTIF_ID,
            title:     'Kharcha 💸',
            body:      "Don't forget to log today's expenses!",
            channelId: 'sms-expense',   // reuse existing channel (has sound)
            schedule: {
              on:             { hour: 22, minute: 0 },  // 10:00 PM every day
              every:          'day',
              allowWhileIdle: true,
            },
          }],
        })
      } catch { /* silent — notification is a bonus */ }
    }

    scheduleIfNeeded()
  }, [enabled])
}
