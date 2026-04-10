import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUser, createUser } from '../firebase/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = loading
  const [userProfile, setUserProfile]   = useState(null)
  const [authLoading, setAuthLoading]   = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const profile = await getUser(fbUser.uid)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  async function refreshProfile() {
    if (!firebaseUser) return
    const profile = await getUser(firebaseUser.uid)
    setUserProfile(profile)
  }

  const loading = authLoading

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
