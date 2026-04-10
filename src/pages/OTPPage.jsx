import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyOTP, sendOTP } from '../firebase/auth'
import { getUser } from '../firebase/db'
import { useAuth } from '../contexts/AuthContext'

export default function OTPPage() {
  const [otp, setOtp]           = useState(['', '', '', '', '', ''])
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resendTimer, setTimer] = useState(30)
  const inputRefs               = useRef([])
  const navigate  = useNavigate()
  const location  = useLocation()
  const { refreshProfile } = useAuth()

  const phone = location.state?.phone || ''

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setTimer(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  function handleChange(val, idx) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (next.every(d => d !== '')) handleVerify(next.join(''))
  }

  function handleKeyDown(e, idx) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  async function handleVerify(code) {
    setError('')
    setLoading(true)
    try {
      const cred = await verifyOTP(code || otp.join(''))
      const profile = await getUser(cred.user.uid)
      await refreshProfile()
      if (!profile || !profile.displayName) {
        navigate('/setup', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError('Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setError('')
    try {
      await sendOTP(phone, 'recaptcha-container')
      setTimer(30)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch {
      setError('Failed to resend OTP.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-accent-500 flex flex-col items-center justify-center px-4">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
          <span className="text-2xl">📱</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Verify OTP</h1>
        <p className="text-white/70 text-sm mt-1">
          Sent to <span className="font-semibold text-white">{phone}</span>
        </p>
      </div>

      <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl px-5 py-6">
        <p className="text-karcha-muted text-sm mb-5 text-center">Enter the 6-digit code from SMS</p>

        <div className="flex gap-1.5 justify-center mb-5">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(e.target.value, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              className="w-10 h-12 text-center text-xl font-bold border-2 border-karcha-border rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all text-karcha-text bg-gray-50"
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <button
          onClick={() => handleVerify()}
          disabled={loading || otp.join('').length < 6}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50 text-base"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>

        <div className="text-center mt-5">
          {resendTimer > 0 ? (
            <p className="text-karcha-muted text-sm">
              Resend OTP in <span className="font-semibold text-primary-600">{resendTimer}s</span>
            </p>
          ) : (
            <button onClick={handleResend} className="text-primary-600 font-semibold text-sm">
              Resend OTP
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate('/')}
        className="mt-6 text-white/70 text-sm hover:text-white transition-colors"
      >
        ← Change number
      </button>

      <div id="recaptcha-container" />
    </div>
  )
}
