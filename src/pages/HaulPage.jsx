import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { addHaulItem, markHaulDone, deleteHaulItem, subscribeHaulItems } from '../firebase/db'
import Header from '../components/common/Header'
import BottomNav from '../components/common/BottomNav'
import Spinner from '../components/common/Spinner'

function HoursLeft({ doneAt }) {
  const ms = doneAt?.toMillis?.() ?? Date.now()
  const h  = Math.max(0, Math.round((ms + 86_400_000 - Date.now()) / 3_600_000))
  return <span>{h}h</span>
}

export default function HaulPage() {
  const { firebaseUser, userProfile } = useAuth()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText]     = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    if (!userProfile?.coupleId) { setLoading(false); return }
    const unsub = subscribeHaulItems(userProfile.coupleId, data => {
      setItems(data)
      setLoading(false)
    })
    return unsub
  }, [userProfile?.coupleId])

  async function handleAdd(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setAdding(true)
    await addHaulItem(userProfile.coupleId, firebaseUser.uid, t)
    setText('')
    setAdding(false)
    inputRef.current?.focus()
  }

  const pending = items.filter(i => !i.done)
  const done    = items.filter(i => i.done)

  return (
    <div className="min-h-screen bg-karcha-bg pb-28">
      <Header title="Haul 🛒" />

      {/* ── Add form ── */}
      <form onSubmit={handleAdd} className="px-4 pt-4 pb-2 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="What do you need to pick up?"
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 bg-white border border-karcha-border rounded-2xl px-4 py-3 text-sm font-medium text-karcha-text placeholder-gray-300 outline-none focus:border-primary-500 shadow-card"
        />
        <button
          type="submit"
          disabled={adding || !text.trim()}
          className="px-5 py-3 bg-primary-600 text-white font-bold rounded-2xl text-sm shadow-card active:scale-95 transition-transform disabled:opacity-50 flex-shrink-0"
        >
          {adding ? '…' : 'Add'}
        </button>
      </form>

      {/* ── List ── */}
      <div className="px-4 mt-1 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-card mt-6">
            <p className="text-5xl mb-4">🛒</p>
            <p className="font-bold text-karcha-text text-base">All stocked up!</p>
            <p className="text-karcha-muted text-sm mt-1">Add items you need to grab.</p>
          </div>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest px-1 pt-2">
                  Need to pick up · {pending.length} item{pending.length !== 1 ? 's' : ''}
                </p>
                {pending.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card"
                  >
                    {/* Tap to mark done */}
                    <button
                      onClick={() => markHaulDone(item.id, true)}
                      className="w-6 h-6 rounded-full border-2 border-primary-400 flex items-center justify-center flex-shrink-0 active:bg-primary-100 transition-colors"
                      aria-label="Mark picked up"
                    />
                    <p className="flex-1 text-sm font-semibold text-karcha-text leading-snug">
                      {item.text}
                    </p>
                    <button
                      onClick={() => deleteHaulItem(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-karcha-muted flex-shrink-0 transition-colors"
                      aria-label="Delete"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Done / Picked up */}
            {done.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-[10px] font-semibold text-karcha-muted uppercase tracking-widest px-1 pt-2">
                  Picked up · auto-clears in 24h
                </p>
                {done.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-card opacity-50"
                  >
                    {/* Tap to unmark */}
                    <button
                      onClick={() => markHaulDone(item.id, false)}
                      className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform text-white"
                      aria-label="Unmark"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-karcha-muted line-through truncate">
                        {item.text}
                      </p>
                      <p className="text-[10px] text-karcha-muted mt-0.5">
                        Clears in <HoursLeft doneAt={item.doneAt} />
                      </p>
                    </div>
                    <button
                      onClick={() => deleteHaulItem(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-karcha-muted flex-shrink-0 transition-colors"
                      aria-label="Delete"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
