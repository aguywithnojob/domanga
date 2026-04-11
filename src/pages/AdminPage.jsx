import { useState, useEffect } from 'react'
import { onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { setFeatureFlag, getAdminCategories, saveAdminCategories, verifyAdminCredentials } from '../firebase/admin'
import { CATEGORIES } from '../utils/categories'
import Header from '../components/common/Header'
import Spinner from '../components/common/Spinner'

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-primary-600' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  )
}

// ── Admin Login Gate ──────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const ok = await verifyAdminCredentials(username, password)
      if (ok) {
        sessionStorage.setItem('adminAuthed', '1')
        onSuccess()
      } else {
        setError('Invalid username or password.')
      }
    } catch {
      setError('Could not verify credentials. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-karcha-bg flex flex-col">
      <Header title="Admin ⚙️" backTo="/settings" />
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-xs bg-white rounded-2xl shadow-card p-6">
          <p className="text-lg font-extrabold text-karcha-text mb-1">Admin Login</p>
          <p className="text-xs text-karcha-muted mb-6">Enter admin credentials to continue.</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full border border-karcha-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-primary-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-karcha-border rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-primary-500"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? 'Verifying…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel() {
  // Feature flags
  const [flags, setFlags]           = useState({})
  const [newFlagName, setNewFlagName] = useState('')
  const [flagSaving, setFlagSaving]   = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'features'),
      snap => setFlags(snap.exists() ? snap.data() : {}),
      () => setFlags({})
    )
    return unsub
  }, [])

  async function toggleFlag(name, current) {
    setFlagSaving(true)
    try { await setFeatureFlag(name, !current) }
    finally { setFlagSaving(false) }
  }

  async function addFlag() {
    const name = newFlagName.trim().replace(/\s+/g, '_').toLowerCase()
    if (!name) return
    await setFeatureFlag(name, true)
    setNewFlagName('')
  }

  // Categories
  const [catConfig, setCatConfig]   = useState({ disabled: [], custom: [] })
  const [catLoading, setCatLoading] = useState(true)
  const [newEmoji, setNewEmoji]     = useState('')
  const [newLabel, setNewLabel]     = useState('')
  const [catSaving, setCatSaving]   = useState(false)

  useEffect(() => {
    getAdminCategories()
      .then(data => { setCatConfig(data); setCatLoading(false) })
      .catch(() => setCatLoading(false))
  }, [])

  async function persistCat(next) {
    setCatConfig(next)
    setCatSaving(true)
    try { await saveAdminCategories(next) }
    finally { setCatSaving(false) }
  }

  function toggleCategory(id, isCurrentlyDisabled) {
    const disabled = isCurrentlyDisabled
      ? catConfig.disabled.filter(d => d !== id)
      : [...catConfig.disabled, id]
    persistCat({ ...catConfig, disabled })
  }

  function deleteCustomCategory(id) {
    persistCat({ ...catConfig, custom: catConfig.custom.filter(c => c.id !== id) })
  }

  async function addCustomCategory() {
    const emoji = newEmoji.trim() || '📦'
    const label = newLabel.trim()
    if (!label) return
    const id = `custom_${label.toLowerCase().replace(/\s+/g, '_')}`
    if (catConfig.custom.find(c => c.id === id)) return
    persistCat({ ...catConfig, custom: [...catConfig.custom, { id, label, emoji }] })
    setNewEmoji('')
    setNewLabel('')
  }

  const flagEntries   = Object.entries(flags)
  const allCategories = [
    ...CATEGORIES.map(c => ({ ...c, isStatic: true })),
    ...catConfig.custom.map(c => ({ ...c, isStatic: false })),
  ]

  return (
    <div className="min-h-screen bg-karcha-bg pb-10">
      <Header title="Admin ⚙️" backTo="/settings" />

      <div className="px-4 mt-4 space-y-5">

        {/* ── Feature Flags ── */}
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-0.5">Feature Flags</p>
          <p className="text-xs text-karcha-muted mb-4">Toggle features on/off without redeploying.</p>

          {flagEntries.length === 0 && (
            <p className="text-sm text-karcha-muted italic mb-4">No flags yet.</p>
          )}

          <div className="space-y-2 mb-4">
            {flagEntries.map(([name, value]) => (
              <div key={name} className="flex items-center gap-2 py-1 overflow-hidden">
                {/* Text — min-w-0 + overflow-hidden ensures it never pushes the toggle off */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-semibold text-karcha-text truncate">{name}</p>
                  <p className="text-[10px] text-karcha-muted truncate">
                    {typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)}
                  </p>
                </div>
                <Toggle on={!!value} onChange={() => toggleFlag(name, !!value)} disabled={flagSaving} />
              </div>
            ))}
          </div>

          {/* Add flag — stacked on narrow screens */}
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
            <input
              type="text"
              placeholder="e.g. enableBudget"
              value={newFlagName}
              onChange={e => setNewFlagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFlag()}
              className="w-full border border-karcha-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            <button
              onClick={addFlag}
              className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform"
            >
              + Add Flag
            </button>
          </div>
        </div>

        {/* ── Categories ── */}
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-semibold text-karcha-muted uppercase tracking-widest mb-0.5">Categories</p>
          <p className="text-xs text-karcha-muted mb-4">Enable/disable categories in the expense picker.</p>

          {catLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <div className="space-y-1 mb-4">
              {allCategories.map(cat => {
                const isDisabled = catConfig.disabled.includes(cat.id)
                return (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 py-2.5 border-b border-gray-50 last:border-0 transition-opacity ${isDisabled ? 'opacity-40' : ''}`}
                  >
                    {/* Emoji */}
                    <span className="text-xl w-7 text-center flex-shrink-0">{cat.emoji}</span>

                    {/* Label — flex-1 min-w-0 clips long names */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-semibold text-karcha-text truncate">{cat.label}</p>
                      {!cat.isStatic && (
                        <p className="text-[10px] text-primary-500 font-semibold">Custom</p>
                      )}
                    </div>

                    {/* Controls — flex-shrink-0 so they never collapse */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Toggle
                        on={!isDisabled}
                        onChange={() => toggleCategory(cat.id, isDisabled)}
                        disabled={catSaving}
                      />
                      {!cat.isStatic && (
                        <button
                          onClick={() => deleteCustomCategory(cat.id)}
                          className="text-red-400 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add custom category — stacked for narrow screens */}
          <p className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest mt-2 mb-2">
            Add Custom Category
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="🎁"
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                maxLength={2}
                className="w-12 flex-shrink-0 border border-karcha-border rounded-lg px-1 py-2 text-lg text-center outline-none focus:border-primary-500"
              />
              <input
                type="text"
                placeholder="Category name"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomCategory()}
                className="flex-1 min-w-0 border border-karcha-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <button
              onClick={addCustomCategory}
              disabled={catSaving}
              className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
            >
              + Add Category
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('adminAuthed') === '1')
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />
  return <AdminPanel />
}

