import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './config'

// ─── Feature Flags ───────────────────────────────────────────────────────────
export async function getFeatureFlags() {
  const snap = await getDoc(doc(db, 'config', 'features'))
  return snap.exists() ? snap.data() : {}
}

export async function setFeatureFlag(name, value) {
  await setDoc(doc(db, 'config', 'features'), { [name]: value }, { merge: true })
}

// ─── Categories ──────────────────────────────────────────────────────────────
export async function getAdminCategories() {
  const snap = await getDoc(doc(db, 'config', 'categories'))
  if (!snap.exists()) return { disabled: [], custom: [] }
  const { disabled = [], custom = [] } = snap.data()
  return { disabled, custom }
}

export async function saveAdminCategories(data) {
  await setDoc(doc(db, 'config', 'categories'), data)
}

// ─── Admin Auth ──────────────────────────────────────────────────────────────
// Credentials stored at config/adminAuth as { username, passwordHash (SHA-256 hex) }

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyAdminCredentials(username, password) {
  const snap = await getDoc(doc(db, 'config', 'adminAuth'))
  if (!snap.exists()) return false
  const { username: storedUser, passwordHash } = snap.data()
  const hash = await sha256hex(password)
  return username === storedUser && hash === passwordHash
}
