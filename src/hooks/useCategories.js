import { useState, useEffect } from 'react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CATEGORIES } from '../utils/categories'

/**
 * Returns the merged category list:
 *   static categories (minus admin-disabled ones) + custom categories from Firestore.
 * Falls back to all static categories if Firestore is unavailable.
 */
export function useCategories() {
  const [categories, setCategories] = useState(CATEGORIES)

  useEffect(() => {
    getDoc(doc(db, 'config', 'categories'))
      .then(snap => {
        if (!snap.exists()) return
        const { disabled = [], custom = [] } = snap.data()
        const merged = [
          ...CATEGORIES.filter(c => !disabled.includes(c.id)),
          ...custom,
        ]
        setCategories(merged)
      })
      .catch(() => {}) // fall back to static list on any error
  }, [])

  return categories
}
