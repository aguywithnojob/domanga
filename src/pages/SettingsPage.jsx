import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCouple } from '../firebase/db'
import { logout } from '../firebase/auth'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'
import { useEffect } from 'react'

export default function SettingsPage() {
  const { userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [couple, setCouple]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    async function load() {
      if (userProfile?.coupleId) {
        const c = await getCouple(userProfile.coupleId)
        setCouple(c)
      }
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Settings" />

      <div className="px-5 mt-6 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-white select-none">
              {userProfile?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-bold text-karcha-text text-lg">{userProfile?.displayName}</p>
              <p className="text-karcha-muted text-sm">{userProfile?.phone}</p>
            </div>
          </div>
        </div>

        {/* Couple info */}
        {loading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : couple ? (
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-4">Couple Info</p>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center text-xl">👫</div>
              <div>
                <p className="font-semibold text-karcha-text text-sm">
                  {couple.members.length === 2 ? 'Linked with partner ✓' : 'Waiting for partner…'}
                </p>
                <p className="text-karcha-muted text-xs">
                  {couple.members.length === 2 ? 'Expenses are shared' : 'Share the code below'}
                </p>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-primary-500 font-semibold uppercase tracking-widest mb-0.5">Your Invite Code</p>
                <p className="text-2xl font-extrabold text-primary-600 tracking-[0.2em]">{couple.inviteCode}</p>
              </div>
              <button
                onClick={copyCode}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <p className="text-karcha-muted text-sm text-center">No couple linked. Go back to setup to create or join one.</p>
          </div>
        )}

        {/* App info */}
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">About</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💸</span>
            <div>
              <p className="font-semibold text-karcha-text">Karcha</p>
              <p className="text-karcha-muted text-xs">Expense analyzer for couples · v1.0</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 border border-red-100 text-red-500 font-semibold py-4 rounded-2xl text-sm active:scale-95 transition-transform"
        >
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
