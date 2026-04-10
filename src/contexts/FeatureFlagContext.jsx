import { createContext, useContext, useState, useEffect } from 'react'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

const FlagContext = createContext({})

export const useFlags = () => useContext(FlagContext)

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
