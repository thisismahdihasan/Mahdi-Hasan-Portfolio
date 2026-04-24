'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useState } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
}

const chevron = (
  <svg className="w-3.5 h-3.5 text-white/35 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

export default function DashboardSelect({ value, onChange, options, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  const triggerCls = [
    'w-full flex items-center justify-between gap-2',
    'bg-[#1a1a1a] border rounded-lg px-3 py-2 text-sm text-white',
    'focus:outline-none transition-colors cursor-pointer',
    open
      ? 'border-[#D4AF37]/40 ring-1 ring-[#D4AF37]/20'
      : 'border-white/[0.10] hover:border-white/20',
    className,
  ].join(' ')

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={triggerCls}>
          <span className="truncate">{selected?.label ?? value}</span>
          <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            {chevron}
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-[200] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-white/[0.10] bg-[#1a1a1a] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
          style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}
        >
          {options.map(opt => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className={[
                'flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer outline-none transition-colors',
                opt.value === value
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'text-white/75 hover:bg-white/[0.06] hover:text-white',
              ].join(' ')}
            >
              {opt.value === value && (
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {opt.value !== value && <span className="w-3 flex-shrink-0" />}
              {opt.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
