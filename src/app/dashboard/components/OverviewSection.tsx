'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Stats {
  total: number
  published: number
  drafts: number
  skills: number
  categories: number
}

interface RecentProject {
  id: string
  title: string
  slug: string
  category: string
  status: string
  image_url: string
  updated_at: string
}

interface Props {
  user: User
  onNavigate: (s: 'projects' | 'skills') => void
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const greeting = (h: number) =>
  h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

export default function OverviewSection({ user, onNavigate }: Props) {
  const now = useClock()
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, drafts: 0, skills: 0, categories: 0 })
  const [recent, setRecent] = useState<RecentProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [
        { data: projects },
        { data: skills },
        { data: categories },
        { data: recentProjects },
      ] = await Promise.all([
        supabase.from('projects').select('status'),
        supabase.from('skills').select('id'),
        supabase.from('skill_categories').select('id'),
        supabase.from('projects').select('id, title, slug, category, status, image_url, updated_at')
          .order('updated_at', { ascending: false }).limit(5),
      ])

      const total = projects?.length ?? 0
      const published = projects?.filter(p => p.status === 'published').length ?? 0
      setStats({
        total,
        published,
        drafts: total - published,
        skills: skills?.length ?? 0,
        categories: categories?.length ?? 0,
      })
      setRecent((recentProjects ?? []) as RecentProject[])
      setLoading(false)
    }
    load()
  }, [])

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const [timePart, ampm] = timeStr.split(' ')
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const name = user.email?.split('@')[0] ?? 'Admin'

  const statCards = [
    { label: 'Total Projects', value: stats.total, sub: null,                      accent: true,  icon: '📁' },
    { label: 'Published',      value: stats.published, sub: null,                  accent: false, icon: '🌐' },
    { label: 'Drafts',         value: stats.drafts, sub: null,                     accent: false, icon: '✏️' },
    { label: 'Skills',         value: stats.skills, sub: `/ ${stats.categories}`,  accent: false, icon: '⚡' },
  ]

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="space-y-6 w-full">

      {/* ── Hero row: clock + quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Clock card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141414] p-8 flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4AF37]/[0.04] blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-1">Current Session</p>
            <h2 className="text-2xl font-semibold text-white/90">
              {greeting(now.getHours())}, <span className="capitalize">{name}</span>
            </h2>
          </div>
          <div className="mt-6">
            <div className="flex items-baseline gap-2">
              <span className="text-[64px] leading-none font-extralight tracking-tight text-white">{timePart}</span>
              <span className="text-2xl font-light text-white/30 uppercase">{ampm}</span>
            </div>
            <p className="text-sm text-white/35 mt-1.5">{dateStr}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6 flex flex-col gap-3">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-1">Quick Actions</p>
          {[
            { label: 'New Project', icon: 'add_circle', action: () => onNavigate('projects') },
            { label: 'Add Skill',   icon: 'bolt',       action: () => onNavigate('skills') },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center justify-between p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/[0.04] transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#D4AF37] text-[18px]">{item.icon}</span>
                <span className="text-sm lg:text-base text-white/70 group-hover:text-white/90 transition-colors">{item.label}</span>
              </div>
              <span className="material-symbols-outlined text-white/20 group-hover:text-[#D4AF37]/60 group-hover:translate-x-0.5 transition-all text-[16px]">arrow_forward</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div
            key={i}
            className={`rounded-2xl border bg-[#141414] p-5 flex flex-col gap-3
              ${s.accent ? 'border-[#D4AF37]/30 border-l-2' : 'border-white/[0.07]'}`}
          >
            <p className="text-[10px] lg:text-xs font-bold tracking-[0.2em] uppercase text-white/30">{s.label}</p>
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-white">{loading ? '—' : s.value}</span>
                {s.sub && <span className="text-sm text-white/30">{s.sub}</span>}
              </div>
              <span className="text-2xl opacity-30">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent projects ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base lg:text-lg font-semibold text-white/90">Recent Projects</h3>
          <button
            onClick={() => onNavigate('projects')}
            className="text-xs lg:text-sm text-[#D4AF37] hover:text-[#D4AF37]/70 transition-colors"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-white/25 text-center py-10">No projects yet.</p>
        ) : (
          <>
            {/* ── Desktop/tablet list (sm+) — unchanged ── */}
            <div className="hidden sm:block space-y-1">
              {recent.map(p => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.04] flex-shrink-0">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <span className="material-symbols-outlined text-[20px]">image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm lg:text-base font-medium text-white/85 truncate">{p.title}</p>
                    <p className="text-xs lg:text-sm text-white/30 mt-0.5">
                      {timeAgo(p.updated_at)} · <span className="capitalize">{p.category}</span>
                    </p>
                  </div>
                  <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0
                    ${p.status === 'published'
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'bg-white/[0.06] text-white/35 border border-white/[0.08]'
                    }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Mobile list (<sm) — max 3, clean card rows ── */}
            <div className="sm:hidden space-y-3">
              {recent.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.04] flex-shrink-0">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <span className="material-symbols-outlined text-[20px]">image</span>
                      </div>
                    )}
                  </div>

                  {/* Info + badge */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Title — allows 2 lines */}
                    <p className="text-sm font-medium text-white/85 leading-snug line-clamp-2">{p.title}</p>
                    {/* Meta row: time · category + badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-white/35">
                        {timeAgo(p.updated_at)} · <span className="capitalize">{p.category}</span>
                      </p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0
                        ${p.status === 'published'
                          ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                          : 'bg-white/[0.06] text-white/35 border border-white/[0.08]'
                        }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
