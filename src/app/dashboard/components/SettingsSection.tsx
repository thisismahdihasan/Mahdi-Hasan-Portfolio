'use client'

import type { User } from '@supabase/supabase-js'

interface Props {
  user: User
  onSignOut: () => void
}

export default function SettingsSection({ user, onSignOut }: Props) {
  return (
    <div className="space-y-6 max-w-[640px]">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Settings</h2>
        <p className="text-sm text-white/30 mt-0.5">Account and preferences</p>
      </div>

      {/* Account */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6 space-y-4">
        <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white/30">Account</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/25 flex items-center justify-center text-sm font-bold text-[#D4AF37]">
            {user.email?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">{user.email}</p>
            <p className="text-xs text-white/30 mt-0.5">Authenticated via Supabase</p>
          </div>
        </div>
        <div className="pt-2 border-t border-white/[0.06]">
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign out
          </button>
        </div>
      </div>

      {/* Preferences placeholder */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6 space-y-4">
        <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white/30">Preferences</h3>
        <div className="space-y-3">
          {['Dark mode', 'Email notifications', 'Auto-publish drafts'].map(pref => (
            <div key={pref} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
              <span className="text-sm text-white/60">{pref}</span>
              <div className="w-9 h-5 rounded-full bg-white/[0.08] border border-white/[0.10] relative cursor-not-allowed opacity-40">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white/30" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/20">Preference settings coming soon.</p>
      </div>

      {/* Dashboard info */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6">
        <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white/30 mb-4">About</h3>
        <div className="space-y-2 text-sm text-white/40">
          <div className="flex justify-between"><span>Version</span><span className="text-white/60">1.0.0</span></div>
          <div className="flex justify-between"><span>Backend</span><span className="text-white/60">Supabase</span></div>
          <div className="flex justify-between"><span>Framework</span><span className="text-white/60">Next.js 14</span></div>
        </div>
      </div>
    </div>
  )
}
