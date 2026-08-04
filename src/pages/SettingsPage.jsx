import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFlags } from '../contexts/FeatureFlagContext'
import { getCouple, updateUser } from '../firebase/db'
import { logout, linkGoogleAccount } from '../firebase/auth'
import { subscribePush } from '../firebase/messaging'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'

export default function SettingsPage() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth()
  const flags = useFlags()
  const navigate = useNavigate()
  const [couple, setCouple]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [copied, setCopied]           = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const [linkError, setLinkError]         = useState('')

  const googleLinked = !!firebaseUser?.providerData?.some(p => p.providerId === 'google.com')

  useEffect(() => {
    async function load() {
      if (userProfile?.coupleId) {
        const c = await getCouple(userProfile.coupleId)
        setCouple(c)
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

  async function handleLinkGoogle() {
    setLinkError('')
    setLinkingGoogle(true)
    try {
      const result = await linkGoogleAccount()
      if (result?.user?.email && userProfile?.id) {
        await updateUser(userProfile.id, { email: result.user.email })
      }
      await refreshProfile()
    } catch (err) {
      console.error('[LinkGoogleAccount]', err)
      if (err.code === 'auth/credential-already-in-use') {
        setLinkError('That Google account is already linked to a different profile. Try a different Google account.')
      } else if (err.code === 'auth/provider-already-linked') {
        setLinkError('A Google account is already linked to this profile.')
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // user cancelled — no error message needed
      } else if (err.code === 'auth/requires-recent-login') {
        setLinkError('Please sign out and sign back in, then try linking again.')
      } else if (err.code === 'auth/network-request-failed') {
        setLinkError('Network error. Check your connection.')
      } else {
        // TODO: remove this raw error dump once native Google Sign-In is confirmed working — temporary for debugging
        setLinkError(`Could not link Google account: ${err?.code || ''} ${err?.message || String(err)}`.trim())
      }
    } finally {
      setLinkingGoogle(false)
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
              <p className="text-karcha-muted text-sm">{userProfile?.phone || userProfile?.email || '—'}</p>
            </div>
            <button onClick={handleLogout} className="text-xs font-semibold text-red-400 active:opacity-60">
              Sign out
            </button>
          </div>
        </div>

        {/* Sign-in methods — lets existing Phone-OTP users also link Google without losing their uid/data */}
        <div className="bg-white rounded-xl p-4 shadow-card">
          <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">Sign-in Methods</p>

          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">📱</span>
              <p className="text-sm font-semibold text-karcha-text truncate">{userProfile?.phone || '—'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-gray-50 mt-1 pt-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">🔑</span>
              {googleLinked ? (
                <p className="text-sm font-semibold text-karcha-text truncate">{firebaseUser?.email}</p>
              ) : (
                <p className="text-sm text-karcha-muted">Google not linked</p>
              )}
            </div>
            {!googleLinked && (
              <button
                onClick={handleLinkGoogle}
                disabled={linkingGoogle}
                className="flex-shrink-0 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold active:scale-95 transition-transform disabled:opacity-60"
              >
                {linkingGoogle ? 'Linking…' : 'Link Google'}
              </button>
            )}
          </div>

          {linkError && <p className="text-red-500 text-xs mt-2">{linkError}</p>}
          <p className="text-karcha-muted text-[11px] mt-2">
            Linking Google lets you sign in either way — your mobile number and expenses stay the same.
          </p>
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
                <p className="font-semibold text-karcha-text text-sm flex items-center gap-1.5">
                  {couple.members.length === 2
                    ? <><span className="text-green-500">✓</span> Linked with partner</>
                    : 'Waiting for partner…'}
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



        {/* Category Budgets */}
        <Link
          to="/category-budgets"
          className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-card"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <p className="text-sm font-semibold text-karcha-text">Category Budgets</p>
          </div>
          <span className="text-karcha-muted text-sm">›</span>
        </Link>

        {/* Scan — only when enablescan flag is on */}
        {flags.enablescan && (
          <Link
            to="/scan"
            className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-card"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📷</span>
              <div>
                <p className="text-sm font-semibold text-karcha-text">Scan Receipt</p>
                <p className="text-[11px] text-karcha-muted">Bulk-add from a screenshot</p>
              </div>
            </div>
            <span className="text-karcha-muted text-sm">›</span>
          </Link>
        )}

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
          Karcha v{__APP_VERSION__.split('.').slice(0, 2).join('.')} &nbsp;&middot;&nbsp; {new Date(__BUILD_TIME__).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} &nbsp;&middot;&nbsp; @aguywithnojob
        </p>
      </div>

      <BottomNav />
    </div>
  )
}

