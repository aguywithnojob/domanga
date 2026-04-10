import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { getUser, createUser } from '../firebase/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser]   = useState(undefined) // undefined = loading
  const [userProfile, setUserProfile]     = useState(null)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [authLoading, setAuthLoading]     = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const profile = await getUser(fbUser.uid)
        setUserProfile(profile)
        if (profile?.partnerId) {
          const pp = await getUser(profile.partnerId)
          setPartnerProfile(pp)
        } else {
          setPartnerProfile(null)
        }
      } else {
        setUserProfile(null)
        setPartnerProfile(null)
      }
      setAuthLoading(false)
    })
    return unsub
  }, [])

  async function refreshProfile() {
    if (!firebaseUser) return
    const profile = await getUser(firebaseUser.uid)
    setUserProfile(profile)
    if (profile?.partnerId) {
      const pp = await getUser(profile.partnerId)
      setPartnerProfile(pp)
    } else {
      setPartnerProfile(null)
    }
  }

  const loading = authLoading

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, partnerProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
