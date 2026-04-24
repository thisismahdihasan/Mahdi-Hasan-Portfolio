'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import DashboardLayout from './components/DashboardLayout'
import OverviewSection from './components/OverviewSection'
import ProjectsManager from './components/ProjectsManager'
import SkillsManager from './components/SkillsManager'
import AnalyticsSection from './components/AnalyticsSection'
import SettingsSection from './components/SettingsSection'

type Section = 'overview' | 'projects' | 'skills' | 'analytics' | 'settings'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<Section>('overview')

  // Auth fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    setSigningIn(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-[#D4AF37]/70 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Login ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-1">Portfolio Admin</p>
          <h1 className="text-xl font-semibold text-white mb-1">Sign in</h1>
          <p className="text-sm text-white/30 mb-8">Premium access only</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
              />
            </div>
            {authError && <p className="text-xs text-red-400/80">{authError}</p>}
            <button
              type="submit"
              disabled={signingIn}
              className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-sm font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-50"
            >
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  const renderSection = () => {
    switch (section) {
      case 'overview':
        return (
          <OverviewSection
            user={user}
            onNavigate={s => setSection(s)}
          />
        )
      case 'projects':
        return <ProjectsManager />
      case 'skills':
        return <SkillsManager />
      case 'analytics':
        return <AnalyticsSection />
      case 'settings':
        return <SettingsSection user={user} onSignOut={handleSignOut} />
    }
  }

  return (
    <DashboardLayout
      user={user}
      active={section}
      onNavigate={setSection}
      onSignOut={handleSignOut}
    >
      {renderSection()}
    </DashboardLayout>
  )
}
