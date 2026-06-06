import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ExpenseProvider } from './contexts/ExpenseContext'
import { FlagProvider, useFlags } from './contexts/FeatureFlagContext'
import { onForegroundMessage } from './firebase/messaging'
import { useSmsIngestion } from './hooks/useSmsIngestion'
import { useDailyNudge } from './hooks/useDailyNudge'
import RequireAuth from './components/common/RequireAuth'
import PageLoader from './components/common/PageLoader'

import LoginPage        from './pages/LoginPage'
import OTPPage          from './pages/OTPPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import DashboardPage    from './pages/DashboardPage'
import AddExpensePage   from './pages/AddExpensePage'
import EditExpensePage  from './pages/EditExpensePage'
import ExpensesPage     from './pages/ExpensesPage'
import AnalyticsPage    from './pages/AnalyticsPage'
import SettingsPage     from './pages/SettingsPage'
import AdminPage        from './pages/AdminPage'
import CategoryBudgetPage from './pages/CategoryBudgetPage'
import ScanPage        from './pages/ScanPage'
import HaulPage        from './pages/HaulPage'

function ThemeApplier() {
  const { enabletheme } = useFlags()
  useEffect(() => {
    const primaryColor = enabletheme ? '#2563eb' : '#d97706'
    if (enabletheme) {
      document.documentElement.setAttribute('data-theme', 'blue')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', primaryColor)
  }, [enabletheme])
  return null
}

function AppRoutes() {
  const { firebaseUser, loading, userProfile } = useAuth()
  const { enabledebug, enablelog } = useFlags()
  const [toast, setToast]     = useState(null)
  const [debugLogs, setDebugLogs] = useState([])

  const addDebugLog = (msg) => {
    if (!enabledebug) return
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setDebugLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 30))
  }

  const showToast = (title, body, ms = 4000) => {
    setToast({ title, body })
    setTimeout(() => setToast(null), ms)
  }

  useDailyNudge(!!firebaseUser)

  useSmsIngestion({
    uid:      firebaseUser?.uid,
    coupleId: userProfile?.coupleId,
    enablelog,
    onReady: () => {
      addDebugLog('✅ SMS plugin ready — watching for SMS')
      if (enabledebug) showToast('📱 SMS listening active', 'Bank SMS will be auto-saved')
    },
    onSmsReceived: (body, isTransaction) => {
      addDebugLog(`📨 SMS | transaction=${isTransaction} | "${body.slice(0, 80)}"`)
      if (enabledebug && !isTransaction) showToast('📨 SMS received', 'Not a transaction — ignored', 3000)
    },
    onExpenseCreated: (expense) => {
      addDebugLog(`💾 Saved: ${expense.notifBody}`)
      showToast('✅ Expense auto-saved', expense.notifBody, 5000)
    },
    onError: (err) => {
      addDebugLog(`❌ ERROR: ${err?.message || String(err)}`)
      console.error('[SMS]', err)
      if (enabledebug) showToast('❌ SMS error', err?.message || String(err), 6000)
    },
  })

  useEffect(() => {
    // Only listen for foreground FCM messages if browser supports it
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    let unsub
    try {
      unsub = onForegroundMessage(payload => {
        const { title = 'Karcha 💸', body = '' } = payload.notification ?? {}
        showToast(title, body)
      })
    } catch (e) {
      // FCM not supported in this browser — silently ignore
    }
    return () => unsub?.()
  }, [])

  if (loading) return <PageLoader />

  return (
    <>
      {/* Debug log panel — visible only when enabledebug is on */}
      {enabledebug && debugLogs.length > 0 && (
        <div className="fixed top-16 left-2 right-2 z-50 bg-black/90 text-green-400 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[10px] space-y-0.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-white font-bold text-xs">SMS Debug Log</span>
            <button onClick={() => setDebugLogs([])} className="text-red-400 text-xs">clear</button>
          </div>
          {debugLogs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl flex items-start gap-3 animate-fade-in">
          <span className="text-xl flex-shrink-0">💸</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm">{toast.title}</p>
            {toast.body && <p className="text-white/70 text-xs mt-0.5">{toast.body}</p>}
          </div>
        </div>
      )}
      <Routes>
        {/* Public */}
        <Route path="/"       element={firebaseUser ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/verify" element={<OTPPage />} />
        <Route path="/setup"  element={<ProfileSetupPage />} />

        {/* Protected */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/add"        element={<AddExpensePage />} />
          <Route path="/edit/:id"   element={<EditExpensePage />} />
          <Route path="/expenses"   element={<ExpensesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings"  element={<SettingsPage />} />
          <Route path="/admin"     element={<AdminPage />} />
          <Route path="/category-budgets" element={<CategoryBudgetPage />} />
          <Route path="/scan"            element={<ScanPage />} />
          <Route path="/haul"            element={<HaulPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <FlagProvider>
        <ThemeApplier />
        <AuthProvider>
          <ExpenseProvider>
            <AppRoutes />
          </ExpenseProvider>
        </AuthProvider>
      </FlagProvider>
    </HashRouter>
  )
}
