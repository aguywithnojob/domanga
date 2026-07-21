import { useState, useEffect } from 'react'
import { onSnapshot, doc, collection, getCountFromServer, getDocs, query, limit } from 'firebase/firestore'
import { db } from '../firebase/config'
import { setFeatureFlag, getAdminCategories, saveAdminCategories, verifyAdminCredentials, getKeywordRules, saveKeywordRules } from '../firebase/admin'
import { fetchAndPurgeSmsLogs } from '../utils/smsLogger'
import { CATEGORIES } from '../utils/categories'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/common/Header'
import Spinner from '../components/common/Spinner'

// ── Collapsible Section ───────────────────────────────────────────────────────
function Section({ title, subtitle, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
      >
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-karcha-text">{title}</p>
          {subtitle && <p className="text-[11px] text-karcha-muted mt-0.5">{subtitle}</p>}
        </div>
        <span className={`text-karcha-muted text-lg transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && <div className="border-t border-karcha-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  )
}

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

// ── SMS Logs ─────────────────────────────────────────────────────────────────
function SmsLogsSection({ uid }) {
  const [logs, setLogs]       = useState(null)   // null = not loaded yet
  const [loading, setLoading] = useState(false)

  async function loadLogs() {
    if (!uid) return
    setLoading(true)
    const entries = await fetchAndPurgeSmsLogs(uid)
    setLogs(entries)
    setLoading(false)
  }

  function formatTime(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <Section icon="🪵" title="SMS Logs" subtitle="Last 24 h · auto-purged daily · max 100 entries">
      {logs === null ? (
        <button
          onClick={loadLogs}
          className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform"
        >
          Load Logs
        </button>
      ) : loading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-karcha-muted italic">No logs in the last 24 hours.</p>
      ) : (
        <>
          <button
            onClick={loadLogs}
            className="mb-3 text-xs text-primary-600 font-semibold active:opacity-60"
          >
            ↻ Refresh
          </button>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map(log => (
              <div
                key={log.id}
                className={`rounded-lg px-3 py-2 text-xs font-mono ${
                  log.level === 'error' ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={`font-bold uppercase tracking-widest text-[10px] ${log.level === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                    {log.level}
                  </span>
                  <span className="text-karcha-muted text-[10px]">{formatTime(log.createdAt)}</span>
                </div>
                <p className="text-karcha-text break-words">{log.message}</p>
                {log.preview && (
                  <p className="text-karcha-muted mt-1 break-words">"{log.preview}"</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  )
}

// ── Firestore Health ──────────────────────────────────────────────────────────
// Spark (free) plan quotas — see https://firebase.google.com/pricing
const SPARK_STORAGE_BYTES = 1 * 1024 * 1024 * 1024 // 1 GiB
const HEALTH_COLLECTIONS = ['expenses', 'users', 'couples', 'haulItems']

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function ProgressBar({ pct }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function FirestoreHealthSection() {
  const [result, setResult]   = useState(null) // { collections: [{name,count,bytes}], totalBytes }
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function checkHealth() {
    setLoading(true)
    setError('')
    try {
      const collections = []
      for (const name of HEALTH_COLLECTIONS) {
        const colRef = collection(db, name)
        const countSnap = await getCountFromServer(colRef)
        const count = countSnap.data().count

        // Sample up to 20 docs to estimate average document size in bytes.
        let avgBytes = 0
        if (count > 0) {
          const sampleSnap = await getDocs(query(colRef, limit(20)))
          const sizes = sampleSnap.docs.map(d => new TextEncoder().encode(JSON.stringify(d.data())).length)
          avgBytes = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
        }
        collections.push({ name, count, bytes: Math.round(avgBytes * count) })
      }
      const totalBytes = collections.reduce((s, c) => s + c.bytes, 0)
      setResult({ collections, totalBytes })
    } catch (e) {
      setError(e?.message || 'Could not read Firestore stats.')
    } finally {
      setLoading(false)
    }
  }

  const pct = result ? (result.totalBytes / SPARK_STORAGE_BYTES) * 100 : 0

  return (
    <Section icon="🩺" title="Firestore Health" subtitle="Estimated storage usage on free Spark plan">
      {result === null ? (
        <button
          onClick={checkHealth}
          disabled={loading}
          className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'Check Health'}
        </button>
      ) : (
        <>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="mb-3 text-xs text-primary-600 font-semibold active:opacity-60 disabled:opacity-40"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold text-karcha-text">Storage used (estimated)</p>
              <p className="text-xs font-semibold text-karcha-muted">{pct.toFixed(3)}%</p>
            </div>
            <ProgressBar pct={pct} />
            <p className="text-[11px] text-karcha-muted mt-1.5">
              {formatBytes(result.totalBytes)} of {formatBytes(SPARK_STORAGE_BYTES)} free tier
            </p>
          </div>

          <div className="space-y-1.5 mb-4">
            {result.collections.map(c => (
              <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <p className="text-sm font-semibold text-karcha-text">{c.name}</p>
                <div className="text-right">
                  <p className="text-xs font-semibold text-karcha-text">{c.count.toLocaleString()} docs</p>
                  <p className="text-[10px] text-karcha-muted">{formatBytes(c.bytes)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </Section>
  )
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel() {
  const { firebaseUser } = useAuth()
  // ─ Feature flags ─
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

  // ─ Categories ─
  const [catConfig, setCatConfig]   = useState({ disabled: [], custom: [] })
  const [catLoading, setCatLoading] = useState(true)
  const [newEmoji, setNewEmoji]     = useState('')
  const [newLabel, setNewLabel]     = useState('')
  const [catSaving, setCatSaving]   = useState(false)
  const [catError, setCatError]     = useState('')

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

    // Duplicate check — case-insensitive, across static + custom
    const labelLower = label.toLowerCase()
    const staticDupe  = CATEGORIES.some(c => c.label.toLowerCase() === labelLower)
    const customDupe  = catConfig.custom.some(c => c.label.toLowerCase() === labelLower)
    if (staticDupe || customDupe) {
      setCatError(`"${label}" already exists.`)
      return
    }

    // Clean ID — no custom_ prefix
    const id = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    setCatError('')
    persistCat({ ...catConfig, custom: [...catConfig.custom, { id, label, emoji }] })
    setNewEmoji('')
    setNewLabel('')
  }

  // ─ Keyword rules ─
  const [kwRules, setKwRules]       = useState(null)   // null = loading
  const [kwKeyword, setKwKeyword]   = useState('')
  const [kwCatId, setKwCatId]       = useState('food')
  const [kwSaving, setKwSaving]     = useState(false)

  useEffect(() => {
    getKeywordRules().then(setKwRules).catch(() => setKwRules([]))
  }, [])

  async function persistKw(next) {
    setKwRules(next)
    setKwSaving(true)
    try { await saveKeywordRules(next) }
    finally { setKwSaving(false) }
  }

  async function addKeyword() {
    const keyword = kwKeyword.trim().toLowerCase()
    if (!keyword || !kwCatId) return
    if (kwRules.some(r => r.keyword === keyword)) return
    await persistKw([...kwRules, { keyword, categoryId: kwCatId }])
    setKwKeyword('')
  }

  async function deleteKeyword(keyword) {
    await persistKw(kwRules.filter(r => r.keyword !== keyword))
  }

  const flagEntries   = Object.entries(flags)
  const allCategories = [
    ...CATEGORIES.map(c => ({ ...c, isStatic: true })),
    ...catConfig.custom.map(c => ({ ...c, isStatic: false })),
  ]

  return (
    <div className="min-h-screen bg-karcha-bg pb-10">
      <Header title="Admin ⚙️" backTo="/settings" />

      <div className="px-4 mt-4 space-y-3">

        {/* ── Firestore Health ── */}
        <FirestoreHealthSection />

        {/* ── Feature Flags ── */}
        <Section icon="🚩" title="Feature Flags" subtitle="Toggle features without redeploying" defaultOpen>
          {flagEntries.length === 0 && (
            <p className="text-sm text-karcha-muted italic mb-4">No flags yet.</p>
          )}
          <div className="space-y-2 mb-4">
            {flagEntries.map(([name, value]) => (
              <div key={name} className="flex items-center gap-2 py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-karcha-text truncate">{name}</p>
                  <p className="text-[10px] text-karcha-muted">{typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)}</p>
                </div>
                <Toggle on={!!value} onChange={() => toggleFlag(name, !!value)} disabled={flagSaving} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
            <input
              type="text"
              placeholder="e.g. enableBudget"
              value={newFlagName}
              onChange={e => setNewFlagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFlag()}
              className="w-full border border-karcha-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            <button onClick={addFlag} className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform">
              + Add Flag
            </button>
          </div>
        </Section>

        {/* ── Categories ── */}
        <Section icon="🏷️" title="Categories" subtitle="Enable/disable & add custom categories">
          {catLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <div className="space-y-1 mb-4">
              {allCategories.map(cat => {
                const isDisabled = catConfig.disabled.includes(cat.id)
                return (
                  <div key={cat.id} className={`flex items-center gap-2 py-2.5 border-b border-gray-50 last:border-0 transition-opacity ${isDisabled ? 'opacity-40' : ''}`}>
                    <span className="text-xl w-7 text-center flex-shrink-0">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-karcha-text truncate">{cat.label}</p>
                      {!cat.isStatic && <p className="text-[10px] text-primary-500 font-semibold">Custom</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Toggle on={!isDisabled} onChange={() => toggleCategory(cat.id, isDisabled)} disabled={catSaving} />
                      {!cat.isStatic && (
                        <button onClick={() => deleteCustomCategory(cat.id)} className="text-red-400 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50">×</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest mb-2">Add Custom Category</p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input type="text" placeholder="🎁" value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={2}
                className="w-12 flex-shrink-0 border border-karcha-border rounded-lg px-1 py-2 text-lg text-center outline-none focus:border-primary-500" />
              <input type="text" placeholder="Category name" value={newLabel}
                onChange={e => { setNewLabel(e.target.value); setCatError('') }}
                onKeyDown={e => e.key === 'Enter' && addCustomCategory()}
                className={`flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 ${catError ? 'border-red-400' : 'border-karcha-border'}`} />
            </div>
            {catError && <p className="text-red-500 text-xs">{catError}</p>}
            <button onClick={addCustomCategory} disabled={catSaving} className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60">
              + Add Category
            </button>
          </div>
        </Section>


        {/* ── SMS Logs ── */}
        {flags.enablelog && <SmsLogsSection uid={firebaseUser?.uid} />}

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

