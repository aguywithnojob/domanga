import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore'
import { db } from './config'

// ─── User ────────────────────────────────────────────────────────────────────

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}

export async function createUser(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    coupleId: null,
    partnerId: null,
    createdAt: serverTimestamp(),
  })
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

// ─── Budget ───────────────────────────────────────────────────────────────────
// Stored on the couple doc as `monthlyBudget` (a number, INR)

export async function setBudget(coupleId, amount) {
  await updateDoc(doc(db, 'couples', coupleId), { monthlyBudget: amount })
}

export async function setCategoryBudgets(coupleId, budgets) {
  await updateDoc(doc(db, 'couples', coupleId), { categoryBudgets: budgets })
}

// ─── OTP Rate Limiting ───────────────────────────────────────────────────────
// Stores send attempts per phone. Max 5 sends per 24 hours.
const OTP_MAX_PER_DAY = 10
const OTP_WINDOW_MS   = 24 * 60 * 60 * 1000 // 24 hours

function phoneToDocId(phone) {
  return phone.replace(/\+/g, '').replace(/\s/g, '')
}

export async function checkOtpRateLimit(phone) {
  const ref  = doc(db, 'otpLimits', phoneToDocId(phone))
  const snap = await getDoc(ref)
  if (!snap.exists()) return // no record → allow

  const { windowStart, count } = snap.data()
  const start = windowStart?.toDate ? windowStart.toDate().getTime() : 0
  const now   = Date.now()

  if (now - start < OTP_WINDOW_MS && count >= OTP_MAX_PER_DAY) {
    const resetAt = new Date(start + OTP_WINDOW_MS)
    const mins = Math.ceil((resetAt.getTime() - now) / 60000)
    throw Object.assign(
      new Error(`Too many OTP requests. Try again in ${mins} minute(s).`),
      { code: 'auth/rate-limited' }
    )
  }
}

export async function recordOtpSend(phone) {
  const ref  = doc(db, 'otpLimits', phoneToDocId(phone))
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, { windowStart: serverTimestamp(), count: 1 })
    return
  }

  const { windowStart } = snap.data()
  const start = windowStart?.toDate ? windowStart.toDate().getTime() : 0

  if (Date.now() - start >= OTP_WINDOW_MS) {
    // Reset window
    await setDoc(ref, { windowStart: serverTimestamp(), count: 1 })
  } else {
    await updateDoc(ref, { count: increment(1) })
  }
}

// ─── Couple ───────────────────────────────────────────────────────────────────

function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function createCouple(userId) {
  const inviteCode = generateInviteCode()
  const coupleRef = await addDoc(collection(db, 'couples'), {
    members: [userId],
    inviteCode,
    createdAt: serverTimestamp(),
  })
  await updateUser(userId, { coupleId: coupleRef.id })
  return { coupleId: coupleRef.id, inviteCode }
}

export async function getCoupleByInviteCode(code) {
  const q = query(collection(db, 'couples'), where('inviteCode', '==', code))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

export async function joinCouple(userId, inviteCode) {
  const couple = await getCoupleByInviteCode(inviteCode)
  if (!couple) throw new Error('Invalid invite code.')
  if (couple.members.includes(userId)) throw new Error('You are already in this couple.')
  if (couple.members.length >= 2) throw new Error('This couple already has 2 members.')

  const partnerId = couple.members[0]
  const updatedMembers = [partnerId, userId]

  await updateDoc(doc(db, 'couples', couple.id), { members: updatedMembers })
  await updateUser(userId,    { coupleId: couple.id, partnerId })
  await updateUser(partnerId, { coupleId: couple.id, partnerId: userId })

  return couple.id
}

export async function getCouple(coupleId) {
  const snap = await getDoc(doc(db, 'couples', coupleId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense(coupleId, paidBy, data) {
  // Use local timestamp so addDoc resolves immediately even when offline.
  // serverTimestamp() blocks forever when there's no network connection.
  return addDoc(collection(db, 'expenses'), {
    coupleId,
    paidBy,
    amount: data.amount,
    category: data.category,
    description: data.description || '',
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: Timestamp.now(),
  })
}

export async function getExpenses(coupleId) {
  const q = query(
    collection(db, 'expenses'),
    where('coupleId', '==', coupleId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date.toDate(),
    }))
    .sort(byNewestFirst)
}

// Sort: createdAt desc (recently added first); fall back to date desc
function byNewestFirst(a, b) {
  const aTime = a.createdAt?.toMillis?.() ?? a.date.getTime()
  const bTime = b.createdAt?.toMillis?.() ?? b.date.getTime()
  return bTime - aTime
}

/**
 * Real-time listener for expenses. Calls onChange with sorted array on every change.
 * Returns an unsubscribe function.
 */
// Real-time listener is capped to the last N months (default 12) to keep
// Firestore read counts bounded regardless of account age. Older data is
// never deleted — fetch it on demand with `getExpensesInRange`.
export const EXPENSE_WINDOW_MONTHS = 12

export function subscribeExpenses(coupleId, onChange, monthsBack = EXPENSE_WINDOW_MONTHS) {
  const since = new Date()
  since.setMonth(since.getMonth() - monthsBack)

  const q = query(
    collection(db, 'expenses'),
    where('coupleId', '==', coupleId),
    where('date', '>=', Timestamp.fromDate(since))
  )
  return onSnapshot(q, snap => {
    const data = snap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date.toDate(),
      }))
      .sort(byNewestFirst)
    onChange(data)
  })
}

// One-time fetch for a custom date range that falls (partly or fully)
// outside the real-time window above. Used by the Expenses page date
// filter when the user picks a range older than EXPENSE_WINDOW_MONTHS.
export async function getExpensesInRange(coupleId, from, to) {
  const q = query(
    collection(db, 'expenses'),
    where('coupleId', '==', coupleId),
    where('date', '>=', Timestamp.fromDate(from)),
    where('date', '<=', Timestamp.fromDate(to))
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date.toDate(),
    }))
    .sort(byNewestFirst)
}

export async function deleteExpense(expenseId) {
  await deleteDoc(doc(db, 'expenses', expenseId))
}

export async function updateExpense(expenseId, data) {
  await updateDoc(doc(db, 'expenses', expenseId), {
    amount:      data.amount,
    category:    data.category,
    description: data.description || '',
    date:        Timestamp.fromDate(new Date(data.date)),
  })
}

// ─── Haul (shopping / needs list) ────────────────────────────────────────────
// Collection: `haulItems`, fields: { coupleId, addedBy, text, done, doneAt, createdAt }

export async function addHaulItem(coupleId, addedBy, text) {
  return addDoc(collection(db, 'haulItems'), {
    coupleId,
    addedBy,
    text: text.trim(),
    done: false,
    doneAt: null,
    createdAt: Timestamp.now(),
  })
}

export async function markHaulDone(id, done) {
  await updateDoc(doc(db, 'haulItems', id), {
    done,
    doneAt: done ? Timestamp.now() : null,
  })
}

export async function deleteHaulItem(id) {
  await deleteDoc(doc(db, 'haulItems', id))
}

/** Real-time list. Filters out items done > 24 h ago (and deletes them). */
export function subscribeHaulItems(coupleId, onChange) {
  const q = query(collection(db, 'haulItems'), where('coupleId', '==', coupleId))
  return onSnapshot(q, snap => {
    const now = Date.now()
    const EXPIRY = 24 * 60 * 60 * 1000
    const stale = []
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(item => {
        if (item.done && item.doneAt) {
          const age = now - (item.doneAt?.toMillis?.() ?? 0)
          if (age > EXPIRY) { stale.push(item.id); return false }
        }
        return true
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      })
    // Fire-and-forget cleanup of expired items
    stale.forEach(id => deleteDoc(doc(db, 'haulItems', id)))
    onChange(items)
  })
}
