import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, googleSignIn } from '../firebase/auth'
import { getUser } from '../firebase/db'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const [tab, setTab]         = useState('google') // 'google' | 'phone'
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '')
    return digits.slice(0, 10)
  }

  async function handleSendOTP() {
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) { setError('Enter a valid 10-digit mobile number.'); return }
    setLoading(true)
    try {
      await sendOTP('+91' + digits, 'recaptcha-container')
      navigate('/verify', { state: { phone: '+91' + digits } })
    } catch (err) {
      if (err.code === 'auth/rate-limited')              setError(err.message)
      else if (err.code === 'auth/network-request-failed') setError('Network error. Check your connection.')
      else if (err.code === 'auth/too-many-requests')    setError('Too many attempts. Please wait a few minutes.')
      else setError('Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    try {
      const { user } = await googleSignIn()
      const profile = await getUser(user.uid)
      await refreshProfile()
      if (!profile?.displayName || !profile?.coupleId || !profile?.phone) {
        navigate('/setup', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // user intentionally cancelled — no error message needed
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.')
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This email is already linked to a different sign-in method.')
      } else {
        setError('Google sign-in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-accent-500 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <span className="text-4xl">💸</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Kharcha</h1>
        <p className="text-white/70 mt-2 text-base">Expense tracker for couples</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 gap-1">
          <button
            onClick={() => { setTab('google'); setError('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'google' ? 'bg-white text-primary-700 shadow' : 'text-karcha-muted'
            }`}
          >
            🔑 Google
          </button>
          <button
            onClick={() => { setTab('phone'); setError('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'phone' ? 'bg-white text-primary-700 shadow' : 'text-karcha-muted'
            }`}
          >
            📱 Phone OTP
          </button>
        </div>

        {tab === 'phone' ? (
          <>
            <p className="text-karcha-muted text-sm mb-4">We'll send an OTP to your mobile number.</p>
            <div className="flex items-center border border-karcha-border rounded-2xl overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all mb-4">
              <span className="px-4 py-3.5 bg-gray-50 text-karcha-muted font-medium border-r border-karcha-border text-sm select-none">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                className="flex-1 px-4 py-3.5 text-karcha-text font-medium text-base outline-none bg-white placeholder-gray-300"
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-60 text-base"
            >
              {loading ? 'Sending OTP…' : 'Get OTP'}
            </button>
            <p className="text-center text-karcha-muted text-xs mt-5">
              By continuing you agree to receive an SMS.
            </p>
          </>
        ) : (
          <>
            <p className="text-karcha-muted text-sm mb-5">Sign in with your Google account to continue.</p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-karcha-border hover:bg-gray-50 active:bg-gray-100 text-karcha-text font-semibold py-4 rounded-2xl transition-colors disabled:opacity-60 text-base"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              {loading ? 'Please wait…' : 'Continue with Google'}
            </button>
            <p className="text-center text-karcha-muted text-xs mt-5">
              We'll create your account automatically the first time.
            </p>
          </>
        )}
      </div>

      <div id="recaptcha-container" />
    </div>
  )
}

