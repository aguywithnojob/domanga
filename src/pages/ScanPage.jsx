import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWorker } from 'tesseract.js'
import { useExpenses } from '../contexts/ExpenseContext'
import { useFlags } from '../contexts/FeatureFlagContext'
import { getKeywordRules } from '../firebase/admin'
import { parseOCRText } from '../utils/scanParser'
import { CATEGORIES, getCategoryMeta } from '../utils/categories'
import { formatINR, toInputDate } from '../utils/formatUtils'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'

// ─── Step indicators ──────────────────────────────────────────────────────────
const STEPS = ['Upload', 'Scanning', 'Review', 'Done']

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-1 px-5 pt-4 pb-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-primary-500' : 'bg-gray-200'}`} />
          {i === STEPS.length - 1 && null}
        </div>
      ))}
      <span className="text-xs text-karcha-muted font-semibold ml-1 flex-shrink-0">{STEPS[step]}</span>
    </div>
  )
}

// ─── Single review row ────────────────────────────────────────────────────────
function ReviewRow({ item, index, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)

  return (
    <div className={`bg-white rounded-2xl shadow-card p-4 transition-opacity ${item.skip ? 'opacity-40' : ''}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
            {getCategoryMeta(item.categoryId).emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-karcha-text text-sm truncate">{item.description}</p>
            <p className="text-karcha-muted text-xs mt-0.5">{item.date} · {getCategoryMeta(item.categoryId).label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <p className="font-bold text-karcha-text text-sm">{formatINR(item.amount)}</p>
          <button
            onClick={() => setEditing(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-amber-50 text-karcha-muted text-sm"
          >✏️</button>
          <button
            onClick={() => onUpdate(index, { skip: !item.skip })}
            className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors ${item.skip ? 'bg-gray-100 text-karcha-muted' : 'bg-green-50 text-green-600'}`}
          >{item.skip ? '○' : '✓'}</button>
        </div>
      </div>

      {/* Inline edit panel */}
      {editing && (
        <div className="mt-3 pt-3 border-t border-karcha-border space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest block mb-1">Amount ₹</label>
              <input
                type="number" inputMode="decimal"
                value={item.amount}
                onChange={e => onUpdate(index, { amount: parseFloat(e.target.value) || 0 })}
                className="w-full border border-karcha-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest block mb-1">Date</label>
              <input
                type="date"
                value={item.date}
                max={toInputDate(new Date())}
                onChange={e => onUpdate(index, { date: e.target.value })}
                className="w-full border border-karcha-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest block mb-1">Category</label>
            <select
              value={item.categoryId}
              onChange={e => onUpdate(index, { categoryId: e.target.value })}
              className="w-full border border-karcha-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-primary-500 bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest block mb-1">Note</label>
            <input
              type="text"
              value={item.description}
              onChange={e => onUpdate(index, { description: e.target.value })}
              className="w-full border border-karcha-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <button onClick={() => setEditing(false)} className="text-primary-600 text-xs font-semibold">Done editing</button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ScanPage() {
  const navigate   = useNavigate()
  const { addNew } = useExpenses()
  const { enablescan } = useFlags()

  const [step, setStep]         = useState(0)   // 0=upload 1=scanning 2=review 3=done
  const [progress, setProgress] = useState(0)
  const [items, setItems]       = useState([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [preview, setPreview]   = useState(null)
  const fileRef = useRef()

  if (!enablescan) {
    return (
      <div className="min-h-screen bg-karcha-bg flex flex-col items-center justify-center px-6 pb-24">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-semibold text-karcha-text">Scan is not enabled.</p>
        <p className="text-karcha-muted text-sm mt-1 text-center">Enable the <code className="bg-gray-100 px-1 rounded">enablescan</code> flag in the Admin panel.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-5 text-primary-600 font-semibold text-sm">← Back</button>
        <BottomNav />
      </div>
    )
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    runOCR(file)
  }

  async function runOCR(file) {
    setError('')
    setStep(1)
    setProgress(0)
    try {
      // Load keyword rules from Firestore (admin-managed)
      const firestoreRules = await getKeywordRules().catch(() => [])

      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round((m.progress ?? 0) * 100))
          }
        },
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      const parsed = parseOCRText(text, firestoreRules)
      if (parsed.length === 0) {
        setError('No transactions detected. Try a clearer screenshot or manual entry.')
        setStep(0)
        return
      }
      setItems(parsed.map(p => ({ ...p, skip: false })))
      setStep(2)
    } catch (err) {
      console.error(err)
      setError('Failed to read image. Please try again with a clearer screenshot.')
      setStep(0)
    }
  }

  function updateItem(index, patch) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))
  }

  async function handleAddAll() {
    const toAdd = items.filter(it => !it.skip && it.amount > 0)
    if (!toAdd.length) { setError('No items selected.'); return }
    setSaving(true)
    try {
      for (const it of toAdd) {
        await addNew({ amount: it.amount, category: it.categoryId, description: it.description, date: it.date })
      }
      setStep(3)
    } catch {
      setError('Failed to save some expenses. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = items.filter(it => !it.skip).length

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Scan Receipt" backTo="/dashboard" />
      <StepBar step={step} />

      <div className="px-5 mt-3 space-y-4">

        {/* ── Step 0: Upload ── */}
        {step === 0 && (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              className="bg-white border-2 border-dashed border-primary-300 rounded-3xl p-8 flex flex-col items-center gap-3 active:bg-primary-50 transition-colors cursor-pointer"
            >
              <span className="text-5xl">📸</span>
              <p className="font-bold text-karcha-text text-base">Upload Screenshot</p>
              <p className="text-karcha-muted text-sm text-center">
                Bank app screenshot, UPI history, or SMS transaction list
              </p>
              <span className="mt-1 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-2xl">
                Choose Image
              </span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">💡 Tips for best results</p>
              <ul className="text-amber-700 text-xs space-y-1 list-disc ml-4">
                <li>Use light-theme screenshots (dark may reduce accuracy)</li>
                <li>Ensure ₹ amounts are clearly visible</li>
                <li>You can edit each item before adding</li>
              </ul>
            </div>
          </>
        )}

        {/* ── Step 1: Scanning ── */}
        {step === 1 && (
          <div className="bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-4 text-center">
            {preview && <img src={preview} alt="preview" className="w-32 h-32 object-cover rounded-2xl opacity-60" />}
            <Spinner size="lg" />
            <p className="font-bold text-karcha-text">Reading image…</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-karcha-muted text-sm">{progress}% complete</p>
            <p className="text-karcha-muted text-xs">This may take 10–20 seconds</p>
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-karcha-text">{items.length} transaction{items.length !== 1 ? 's' : ''} detected</p>
              <p className="text-xs text-karcha-muted">{selectedCount} selected</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              {items.map((item, i) => (
                <ReviewRow key={i} item={item} index={i} onUpdate={updateItem} onRemove={updateItem} />
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setStep(0); setItems([]); setPreview(null) }}
                className="flex-1 py-3.5 border-2 border-karcha-border text-karcha-muted font-semibold rounded-2xl text-sm"
              >
                Rescan
              </button>
              <button
                onClick={handleAddAll}
                disabled={saving || selectedCount === 0}
                className="flex-1 py-3.5 bg-primary-600 text-white font-semibold rounded-2xl text-sm disabled:opacity-60"
              >
                {saving ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /> Saving…</span> : `Add ${selectedCount} Expense${selectedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-3xl">✅</div>
            <p className="font-bold text-karcha-text text-lg">Added successfully!</p>
            <p className="text-karcha-muted text-sm">{selectedCount} expense{selectedCount !== 1 ? 's' : ''} added to your history.</p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => { setStep(0); setItems([]); setPreview(null) }}
                className="flex-1 py-3.5 border-2 border-karcha-border text-karcha-muted font-semibold rounded-2xl text-sm"
              >
                Scan Again
              </button>
              <button
                onClick={() => navigate('/expenses')}
                className="flex-1 py-3.5 bg-primary-600 text-white font-semibold rounded-2xl text-sm"
              >
                View Expenses
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
