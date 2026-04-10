import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP } from '../firebase/auth'

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
