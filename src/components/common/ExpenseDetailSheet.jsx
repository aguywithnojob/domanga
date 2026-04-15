import { getCategoryMeta } from '../../utils/categories'
import { formatINR, formatDate } from '../../utils/formatUtils'
import Spinner from './Spinner'

export default function ExpenseDetailSheet({ exp, isMe, partnerName, onClose, onEdit, onDelete, deleting }) {
  const meta = getCategoryMeta(exp.category)
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl pb-safe animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-karcha-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl">
              {meta.emoji}
            </div>
            <div>
              <p className="font-bold text-karcha-text text-base">{meta.label}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isMe ? 'bg-primary-100 text-primary-700' : 'bg-accent-500/10 text-accent-600'
              }`}>
                {isMe ? 'You' : partnerName}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-karcha-muted text-lg">
            ✕
          </button>
        </div>

        {/* Details */}
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-karcha-muted text-sm">Amount</p>
            <p className="text-2xl font-extrabold text-karcha-text">{formatINR(exp.amount)}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-karcha-muted text-sm">Date</p>
            <p className="font-semibold text-karcha-text text-sm">{formatDate(exp.date)}</p>
          </div>
          {exp.description && (
            <div className="flex items-start justify-between gap-4">
              <p className="text-karcha-muted text-sm flex-shrink-0">Note</p>
              <p className="font-semibold text-karcha-text text-sm text-right">{exp.description}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-karcha-muted text-sm">Paid by</p>
            <p className="font-semibold text-karcha-text text-sm">{isMe ? 'You' : partnerName}</p>
          </div>
        </div>

        {/* Actions — only for own expenses */}
        {isMe ? (
          <div className="px-5 pb-6 pt-1 flex gap-3">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-primary-500 text-primary-600 font-semibold rounded-2xl text-sm active:scale-95 transition-transform"
            >
              ✏️ Edit
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-red-200 text-red-500 font-semibold rounded-2xl text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              {deleting ? <Spinner size="sm" /> : '🗑 Delete'}
            </button>
          </div>
        ) : (
          <div className="pb-6" />
        )}
      </div>
    </>
  )
}
