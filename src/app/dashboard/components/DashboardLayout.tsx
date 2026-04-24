'use client'

import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'

type Section = 'overview' | 'home' | 'about' | 'projects' | 'skills' | 'analytics' | 'inbox' | 'settings'

interface NavItem {
  id: Section
  label: string
  icon: string
}

const NAV: NavItem[] = [
  { id: 'overview',   label: 'Overview',   icon: 'grid_view' },
  { id: 'home',       label: 'Home',       icon: 'cottage' },
  { id: 'about',      label: 'About',      icon: 'menu_book' },
  { id: 'projects',   label: 'Projects',   icon: 'folder_open' },
  { id: 'skills',     label: 'Skills',     icon: 'auto_awesome' },
  { id: 'analytics',  label: 'Analytics',  icon: 'insights' },
  { id: 'inbox',      label: 'Inbox',      icon: 'inbox' },
  { id: 'settings',   label: 'Settings',   icon: 'settings' },
]

interface Props {
  user: User
  active: Section
  onNavigate: (s: Section) => void
  onSignOut: () => void
  unreadCount?: number
  children: ReactNode
}

export default function DashboardLayout({ user, active, onNavigate, onSignOut, unreadCount = 0, children }: Props) {
  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <div className="min-h-screen bg-[#111111] text-white">

      {/* ── Desktop Sidebar ── */}
      <aside className="fixed left-0 top-0 w-[260px] h-full border-r border-white/[0.07] bg-[#0e0e0e] hidden lg:flex flex-col z-40">
        {/* Brand */}
        <div className="px-7 pt-8 pb-6">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#D4AF37]">Portfolio Admin</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mt-0.5">Premium Access</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          {NAV.map(item => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-200 text-left
                  ${isActive
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-l-2 border-[#D4AF37] pl-[14px]'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="font-medium tracking-wide">{item.label}</span>
                {item.id === 'inbox' && unreadCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-5 py-5 border-t border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center text-[11px] font-bold text-[#D4AF37] flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{user.email}</p>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="text-white/25 hover:text-white/60 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="lg:ml-[260px] flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 lg:px-10 border-b border-white/[0.06] bg-[#111111]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Mobile brand */}
            <p className="lg:hidden text-[11px] font-bold tracking-[0.2em] uppercase text-[#D4AF37]">Portfolio Admin</p>
            {/* Desktop section title */}
            <h1 className="hidden lg:block text-base lg:text-lg font-semibold text-white/90 capitalize">{active}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Sign out on mobile */}
            <button
              onClick={onSignOut}
              className="lg:hidden text-xs text-white/35 hover:text-white/65 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 lg:px-12 xl:px-16 py-8 pb-28 lg:pb-12">
          <div className="max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full h-[64px] bg-[#0e0e0e]/95 backdrop-blur-xl border-t border-white/[0.07] flex justify-around items-center z-50">
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors relative
                ${isActive ? 'text-[#D4AF37]' : 'text-white/30 hover:text-white/60'}`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold">{item.label}</span>
              {item.id === 'inbox' && unreadCount > 0 && (
                <span className="absolute top-0.5 right-1.5 min-w-[14px] h-[14px] rounded-full bg-[#D4AF37] text-black text-[9px] font-bold flex items-center justify-center px-0.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
