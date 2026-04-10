import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import PageLoader from './PageLoader'

export default function RequireAuth() {
  const { firebaseUser, userProfile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!firebaseUser) return <Navigate to="/" replace />
  if (!userProfile?.displayName) return <Navigate to="/setup" replace />
  if (!userProfile?.coupleId) return <Navigate to="/setup" replace />
  return <Outlet />
}
