import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUser, createUser, createCouple, joinCouple, getCouple } from '../firebase/db'

export default function ProfileSetupPage() {
  const { firebaseUser, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [name, setName]       = useState('')
  const [mode, setMode]       = useState('') // 'create' | 'join'
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  async function handleSubmit() {
    setError('')
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!mode) { setError('Choose an option below.'); return }
    if (mode === 'join' && code.trim().length !== 6) {
      setError('Invite code must be 6 digits.'); return
    }
    setLoading(true)
    try {
      const existing = await getUser(firebaseUser.uid)
      if (!existing) {
        await createUser(firebaseUser.uid, {
          displayName: name.trim(),
          phone: firebaseUser.phoneNumber,
        })
      }
      if (mode === 'create') {
        const current = await getUser(firebaseUser.uid)
        if (current?.coupleId) {
          const couple = await getCouple(current.coupleId)
          setInviteCode(couple.inviteCode)
          await refreshProfile()
          return
        }
        const { inviteCode: ic } = await createCouple(firebaseUser.uid)
        setInviteCode(ic)
        await refreshProfile()
        // Stay on page to show code — user taps Continue
        return
      } else {
        await joinCouple(firebaseUser.uid, code.trim())
        await refreshProfile()
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (inviteCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-accent-500 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-karcha-text mb-2">You're all set!</h2>
          <p className="text-karcha-muted text-sm mb-6">
            Share this invite code with your partner so they can join your couple.
          </p>
          <div className="bg-primary-50 border-2 border-primary-200 rounded-2xl py-5 px-6 mb-6">
            <p className="text-xs text-primary-500 font-semibold uppercase tracking-widest mb-1">Invite Code</p>
            <p className="text-4xl font-extrabold text-primary-600 tracking-[0.3em]">{inviteCode}</p>
          </div>
          <p className="text-karcha-muted text-xs mb-6">
            You can always find this code in Settings later.
          </p>
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full bg-primary-600 text-white font-semibold py-4 rounded-2xl text-base"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-accent-500 flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
          <span className="text-3xl">👫</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Set up your profile</h1>
        <p className="text-white/70 text-sm mt-1">Just a few details to get started</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
        {/* Name */}
        <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-2">
          Your Name
        </label>
        <input
          type="text"
          placeholder="e.g. Priya"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-karcha-border rounded-2xl px-4 py-3.5 text-karcha-text font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 mb-6 text-base"
        />

        {/* Mode selection */}
        <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-3">
          Couple Setup
        </label>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setMode('create')}
            className={`border-2 rounded-2xl py-4 flex flex-col items-center gap-1 transition-all ${
              mode === 'create' ? 'border-primary-500 bg-primary-50' : 'border-karcha-border bg-gray-50'
            }`}
          >
            <span className="text-2xl">✨</span>
            <span className={`text-sm font-semibold ${mode === 'create' ? 'text-primary-600' : 'text-karcha-muted'}`}>
              Create New
            </span>
          </button>
          <button
            onClick={() => setMode('join')}
            className={`border-2 rounded-2xl py-4 flex flex-col items-center gap-1 transition-all ${
              mode === 'join' ? 'border-primary-500 bg-primary-50' : 'border-karcha-border bg-gray-50'
            }`}
          >
            <span className="text-2xl">🔗</span>
            <span className={`text-sm font-semibold ${mode === 'join' ? 'text-primary-600' : 'text-karcha-muted'}`}>
              Join Partner
            </span>
          </button>
        </div>

        {mode === 'join' && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-2">
              Partner's Invite Code
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full border border-karcha-border rounded-2xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.3em] outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-karcha-text"
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-60 text-base"
        >
          {loading ? 'Please wait…' : mode === 'create' ? 'Create Couple' : mode === 'join' ? 'Join Couple' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
