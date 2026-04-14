import { useState, useEffect } from 'react'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CATEGORIES } from '../utils/categories'

/**
 * Returns the merged category list in real-time:
 *   static categories (minus admin-disabled ones) + custom categories from Firestore.
 * Falls back to all static categories if Firestore is unavailable.
 */
export function useCategories() {
  const [categories, setCategories] = useState(CATEGORIES)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'categories'),
      snap => {
        if (!snap.exists()) {
          setCategories(CATEGORIES)
          return
        }
        const { disabled = [], custom = [] } = snap.data()
        const merged = [
          ...CATEGORIES.filter(c => !disabled.includes(c.id)),
          ...custom,
        ]
        setCategories(merged.length > 0 ? merged : CATEGORIES)
      },
      () => setCategories(CATEGORIES) // fall back on permission error
    )
    return unsub
  }, [])

  return categories
}
