import { createContext, useContext, useState, useEffect } from 'react'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

const FlagContext = createContext({})

export const useFlags = () => useContext(FlagContext)

/** Returns theme-aware inline color values for use in SVG / Recharts / style props */
export function useThemeColors() {
  const { enabletheme } = useFlags()
  return enabletheme ? {
    primary:      '#2563eb', // blue-600
    primaryLight: '#bfdbfe', // blue-200
    accent:       '#f97316', // orange-500
  } : {
    primary:      '#16a34a', // green-600
    primaryLight: '#bbf7d0', // green-200
    accent:       '#ec4899', // pink-500
  }
}

export function FlagProvider({ children }) {
  const [flags, setFlags] = useState({})

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'features'),
      snap => setFlags(snap.exists() ? snap.data() : {}),
      () => {} // silently ignore permission errors (not yet signed in)
    )
    return unsub
  }, [])

  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>
}
