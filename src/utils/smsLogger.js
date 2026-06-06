import {
  collection, addDoc, query, orderBy, limit,
  getDocs, writeBatch, where, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'

const MAX_ENTRIES   = 100
const TTL_MS        = 24 * 60 * 60 * 1000   // 1 day

/**
 * Write a log entry to smsLogs/{uid}/entries.
 * Silently fails — logging must never break the main flow.
 * @param {string} uid
 * @param {'info'|'error'} level
 * @param {string} message
 * @param {object} [meta]  optional extra fields (e.g. smsBody, amount)
 */
export async function writeSmsLog(uid, level, message, meta = {}) {
  if (!uid) return
  try {
    const col = collection(db, 'smsLogs', uid, 'entries')
    await addDoc(col, {
      level,
      message,
      ...meta,
      createdAt: Timestamp.now(),
    })
  } catch { /* silent */ }
}

/**
 * Fetch all log entries for a user, purge entries older than 1 day,
 * and return the surviving entries sorted newest-first.
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export async function fetchAndPurgeSmsLogs(uid) {
  if (!uid) return []
  try {
    const col  = collection(db, 'smsLogs', uid, 'entries')
    const snap = await getDocs(query(col, orderBy('createdAt', 'desc'), limit(MAX_ENTRIES)))

    const cutoff  = Timestamp.fromMillis(Date.now() - TTL_MS)
    const batch   = writeBatch(db)
    const entries = []

    snap.docs.forEach(d => {
      if (d.data().createdAt?.toMillis() < cutoff.toMillis()) {
        batch.delete(d.ref)   // older than 1 day → delete
      } else {
        entries.push({ id: d.id, ...d.data() })
      }
    })

    await batch.commit()   // delete stale entries in one round-trip
    return entries
  } catch {
    return []
  }
}
