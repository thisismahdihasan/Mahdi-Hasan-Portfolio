'use client'

import { useEffect } from 'react'

interface Props {
  title: string
  description: string
  warning?: string          // extra red warning line (e.g. cascade notice)
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  title,
  description,
  warning,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-[#D4AF37]/20 bg-[#161616] shadow-[0_24px_64px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-150">
        {/* Gold top accent line */}
        <div className="h-[2px] w-full rounded-t-2xl bg-gradient-to-r from-[#D4AF37]/60 via-[#D4AF37]/30 to-transparent" />

        <div className="p-6">
          {/* Icon + title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 id="confirm-title" className="text-base font-semibold text-white leading-snug">
                {title}
              </h2>
              <p className="text-sm text-white/50 mt-1 leading-relaxed">
                {description}
              </p>
              {warning && (
                <p className="text-xs text-red-400/80 mt-2 leading-relaxed">
                  ⚠ {warning}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.10] text-sm text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-sm font-medium text-red-400 hover:bg-red-500/25 hover:border-red-500/50 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Deleting…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
