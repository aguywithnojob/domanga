import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, emailSignIn } from '../firebase/auth'
import { getUser } from '../firebase/db'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const [tab, setTab]         = useState('phone') // 'phone' | 'email'
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
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

  async function handleEmailSignIn() {
    setError('')
    if (!email.trim())    { setError('Enter your email address.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const { userCredential } = await emailSignIn(email.trim().toLowerCase(), password)
      const profile = await getUser(userCredential.user.uid)
      await refreshProfile()
      if (!profile?.displayName || !profile?.coupleId) {
        navigate('/setup', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Enter a valid email address.')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes.')
      } else {
        setError('Something went wrong. Please try again.')
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
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Karcha</h1>
        <p className="text-white/70 mt-2 text-base">Expense tracker for couples</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 gap-1">
          <button
            onClick={() => { setTab('phone'); setError('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'phone' ? 'bg-white text-primary-700 shadow' : 'text-karcha-muted'
            }`}
          >
            📱 Phone OTP
          </button>
          <button
            onClick={() => { setTab('email'); setError('') }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'email' ? 'bg-white text-primary-700 shadow' : 'text-karcha-muted'
            }`}
          >
            ✉️ Email
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
            <p className="text-karcha-muted text-sm mb-4">Sign in or create an account with your email.</p>
            <div className="space-y-3 mb-4">
              <input
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailSignIn()}
                className="w-full border border-karcha-border rounded-2xl px-4 py-3.5 text-karcha-text font-medium text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmailSignIn()}
                  className="w-full border border-karcha-border rounded-2xl px-4 py-3.5 pr-12 text-karcha-text font-medium text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-karcha-muted text-lg"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              onClick={handleEmailSignIn}
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-60 text-base"
            >
              {loading ? 'Please wait…' : 'Continue'}
            </button>
            <p className="text-center text-karcha-muted text-xs mt-4">
              New here? We'll create your account automatically.
            </p>
          </>
        )}
      </div>

      <div id="recaptcha-container" />
    </div>
  )
}


export default function LoginPage() {
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length <= 10) return digits
    return digits.slice(-10)
  }

  async function handleSendOTP() {
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }
    const e164 = '+91' + digits
    setLoading(true)
    try {
      await sendOTP(e164, 'recaptcha-container')
      navigate('/verify', { state: { phone: e164 } })
    } catch (err) {
      if (err.code === 'auth/rate-limited') {
        setError(err.message)
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection and that your Firebase project is configured correctly.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.')
      } else {
        setError('Failed to send OTP. Please try again.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-accent-500 flex flex-col items-center justify-center px-6">
      {/* Logo area */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <span className="text-4xl">💸</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Karcha</h1>
        <p className="text-white/70 mt-2 text-base">Expense tracker for couples</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
        <h2 className="text-xl font-bold text-karcha-text mb-1">Sign in</h2>
        <p className="text-karcha-muted text-sm mb-6">We'll send an OTP to your mobile number.</p>

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
            className="flex-1 px-4 py-3.5 text-karcha-text font-medium text-base outline-none bg-white placeholder-gray-300"
            onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
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
          By continuing you agree to receive an SMS on this number.
        </p>
      </div>

      {/* Invisible reCAPTCHA anchor */}
      <div id="recaptcha-container" />
    </div>
  )
}
