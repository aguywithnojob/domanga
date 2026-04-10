import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ExpenseProvider } from './contexts/ExpenseContext'
import RequireAuth from './components/common/RequireAuth'
import PageLoader from './components/common/PageLoader'

import LoginPage        from './pages/LoginPage'
import OTPPage          from './pages/OTPPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import DashboardPage    from './pages/DashboardPage'
import AddExpensePage   from './pages/AddExpensePage'
import ExpensesPage     from './pages/ExpensesPage'
import AnalyticsPage    from './pages/AnalyticsPage'
import SettingsPage     from './pages/SettingsPage'

function AppRoutes() {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <PageLoader />

  return (
    <Routes>
      {/* Public */}
      <Route path="/"       element={firebaseUser ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/verify" element={<OTPPage />} />
      <Route path="/setup"  element={<ProfileSetupPage />} />

      {/* Protected */}
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/add"       element={<AddExpensePage />} />
        <Route path="/expenses"  element={<ExpensesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ExpenseProvider>
          <AppRoutes />
        </ExpenseProvider>
      </AuthProvider>
    </HashRouter>
  )
}
