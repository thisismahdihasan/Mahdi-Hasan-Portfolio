'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border text-sm shadow-xl
      ${type === 'success'
        ? 'bg-[#0f1a0f] border-green-500/30 text-green-400'
        : 'bg-[#1a0f0f] border-red-500/30 text-red-400'
      }`}
    >
      <span>{message}</span>
      <button onClick={onDismiss} className="text-white/30 hover:text-white/60 ml-1">✕</button>
    </div>
  )
}
