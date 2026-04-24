'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Counts {
  total: number
  published: number
  drafts: number
  frontend: number
  client: number
  skills: number
  categories: number
}

export default function AnalyticsSection() {
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    const load = async () => {
      const [{ data: projects }, { data: skills }, { data: categories }] = await Promise.all([
        supabase.from('projects').select('status, category'),
        supabase.from('skills').select('id'),
        supabase.from('skill_categories').select('id'),
      ])
      const p = projects ?? []
      setCounts({
        total: p.length,
        published: p.filter(x => x.status === 'published').length,
        drafts: p.filter(x => x.status === 'draft').length,
        frontend: p.filter(x => x.category === 'frontend').length,
        client: p.filter(x => x.category === 'client').length,
        skills: skills?.length ?? 0,
        categories: categories?.length ?? 0,
      })
    }
    load()
  }, [])

  const bar = (value: number, max: number) => (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className="h-full bg-[#D4AF37]/60 rounded-full transition-all duration-700"
        style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%' }}
      />
    </div>
  )

  const rows = counts ? [
    { label: 'Published',       value: counts.published, max: counts.total },
    { label: 'Drafts',          value: counts.drafts,    max: counts.total },
    { label: 'Frontend',        value: counts.frontend,  max: counts.total },
    { label: 'Client Work',     value: counts.client,    max: counts.total },
  ] : []

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-lg font-semibold text-white/90">Analytics</h2>
        <p className="text-sm text-white/30 mt-0.5">Portfolio content overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: counts?.total ?? '—' },
          { label: 'Published',      value: counts?.published ?? '—' },
          { label: 'Skills',         value: counts?.skills ?? '—' },
          { label: 'Categories',     value: counts?.categories ?? '—' },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-[#141414] p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-3">{c.label}</p>
            <span className="text-3xl font-semibold text-white">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6">
        <h3 className="text-sm font-semibold text-white/70 mb-5">Project Breakdown</h3>
        {counts ? (
          <div className="space-y-5">
            {rows.map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-xs text-white/50 mb-1.5">
                  <span>{r.label}</span>
                  <span>{r.value} / {r.max}</span>
                </div>
                {bar(r.value, r.max)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-6 text-center">
        <span className="material-symbols-outlined text-[40px] text-white/10 block mb-3">insights</span>
        <p className="text-sm text-white/30">Detailed analytics coming soon.</p>
      </div>
    </div>
  )
}
