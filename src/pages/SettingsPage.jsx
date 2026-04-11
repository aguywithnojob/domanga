import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCouple, setBudget } from '../firebase/db'
import { logout } from '../firebase/auth'
import { subscribePush } from '../firebase/messaging'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'

export default function SettingsPage() {
  const { userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [couple, setCouple]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [copied, setCopied]           = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetSaved, setBudgetSaved] = useState(false)
  const [notifStatus, setNotifStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    async function load() {
      if (userProfile?.coupleId) {
        const c = await getCouple(userProfile.coupleId)
        setCouple(c)
        if (c?.monthlyBudget) setBudgetInput(String(c.monthlyBudget))
      }
      setLoading(false)
      // If permission already granted, ensure FCM token is saved to Firestore
      if ('Notification' in window && Notification.permission === 'granted' && userProfile?.id) {
        subscribePush(userProfile.id)
      }
    }
    load()
  }, [userProfile])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function copyCode() {
    if (!couple?.inviteCode) return
    navigator.clipboard.writeText(couple.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveBudget() {
    const amt = parseFloat(budgetInput)
    if (!amt || amt <= 0 || !userProfile?.coupleId) return
    await setBudget(userProfile.coupleId, amt)
    setCouple(prev => ({ ...prev, monthlyBudget: amt }))
    setBudgetSaved(true)
    setTimeout(() => setBudgetSaved(false), 2000)
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifStatus(result)
    if (result === 'granted') {
      await subscribePush(userProfile?.id)
    }
  }

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Settings" />

      <div className="px-4 mt-5 space-y-3">
        {/* Profile card */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-accent-500 rounded-xl flex items-center justify-center text-xl font-bold text-white select-none">
              {userProfile?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <p className="font-bold text-karcha-text">{userProfile?.displayName}</p>
              <p className="text-karcha-muted text-sm">{userProfile?.phone}</p>
            </div>
            <button onClick={handleLogout} className="text-xs font-semibold text-red-400 active:opacity-60">
              Sign out
            </button>
          </div>
        </div>

        {/* Monthly Budget */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">Monthly Budget</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 border border-karcha-border rounded-lg px-3 py-2 focus-within:border-primary-500">
              <span className="text-primary-600 font-bold">₹</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 50000"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                className="flex-1 outline-none text-karcha-text font-semibold text-sm bg-transparent"
              />
            </div>
            <button
              onClick={saveBudget}
              className="flex-shrink-0 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform whitespace-nowrap"
            >
              {budgetSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>
          <p className="text-karcha-muted text-xs mt-2">Shared budget for both of you. Shows a progress bar on the dashboard.</p>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">Daily Nudge</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-karcha-text">Remind at 11 PM</p>
              <p className="text-karcha-muted text-xs mt-0.5">
                {notifStatus === 'granted' ? '✅ Notifications enabled' :
                 notifStatus === 'denied'  ? '🚫 Blocked — enable in browser settings' :
                 notifStatus === 'unsupported' ? 'Not supported on this device' :
                 'Tap to allow notifications'}
              </p>
            </div>
            {notifStatus === 'default' && (
              <button
                onClick={requestNotifications}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold"
              >
                Enable
              </button>
            )}
          </div>
        </div>

        {/* Couple info */}
        {loading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : couple ? (
          <div className="bg-white rounded-xl p-4 shadow-card">
            <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">Couple</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-accent-500/10 rounded-lg flex items-center justify-center text-lg">👫</div>
              <div>
                <p className="font-semibold text-karcha-text text-sm">
                  {couple.members.length === 2 ? 'Linked with partner ✓' : 'Waiting for partner…'}
                </p>
                <p className="text-karcha-muted text-xs">
                  {couple.members.length === 2 ? 'Expenses are shared' : 'Share the code below'}
                </p>
              </div>
            </div>
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-primary-500 font-semibold uppercase tracking-widest mb-0.5">Invite Code</p>
                <p className="text-2xl font-extrabold text-primary-600 tracking-[0.2em]">{couple.inviteCode}</p>
              </div>
              <button
                onClick={copyCode}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        ) : null}        

        {/* Admin */}
        <Link
          to="/admin"
          className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-card"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <p className="text-sm font-semibold text-karcha-text">Admin Panel</p>
          </div>
          <span className="text-karcha-muted text-sm">›</span>
        </Link>

        {/* App version */}
        <p className="text-center text-[10px] text-karcha-muted pt-1">
          Karcha v{__APP_VERSION__.split('.').slice(0, 2).join('.')} &nbsp;&middot;&nbsp; {new Date(__BUILD_TIME__).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      </div>

      <BottomNav />
    </div>
  )
}

