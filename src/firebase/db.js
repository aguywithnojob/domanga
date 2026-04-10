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
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'

// ─── User ────────────────────────────────────────────────────────────────────

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
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
  return addDoc(collection(db, 'expenses'), {
    coupleId,
    paidBy,
    amount: data.amount,
    category: data.category,
    description: data.description || '',
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: serverTimestamp(),
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
    .sort((a, b) => b.date - a.date)
}

export async function deleteExpense(expenseId) {
  await deleteDoc(doc(db, 'expenses', expenseId))
}
