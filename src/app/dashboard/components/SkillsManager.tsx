'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'

interface Category {
  id: string
  title: string
  sort_order: number
}

interface Skill {
  id: string
  name: string
  category_id: string
  sort_order: number
}

type ToastState = { message: string; type: 'success' | 'error' } | null

// ── Arrow button ─────────────────────────────────────────────────────────────
function MoveBtn({ dir, disabled, onClick }: { dir: 'up' | 'down'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={dir === 'up' ? 'Move up' : 'Move down'}
      className="w-6 h-6 flex items-center justify-center rounded border border-white/[0.10] text-white/35 hover:text-white/70 hover:border-white/25 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
    >
      {dir === 'up' ? '↑' : '↓'}
    </button>
  )
}

export default function SkillsManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState>(null)
  const [saving, setSaving] = useState(false)

  // Collapse state — Set of collapsed category IDs
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Category edit
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [catDraft, setCatDraft] = useState({ title: '' })

  // Skill edit
  const [editingSkill, setEditingSkill] = useState<string | null>(null)
  const [skillDraft, setSkillDraft] = useState({ name: '' })

  // Add skill form
  const [addingSkillFor, setAddingSkillFor] = useState<string | null>(null)
  const [newSkillName, setNewSkillName] = useState('')

  // New category form
  const [newCatTitle, setNewCatTitle] = useState('')

  // Confirm deletes
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') =>
    setToast({ message, type })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: cats, error: catErr }, { data: sks, error: skErr }] = await Promise.all([
      supabase.from('skill_categories').select('id, title, sort_order, created_at').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('skills').select('id, name, category_id, sort_order, created_at').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    ])
    if (catErr) showToast(catErr.message, 'error')
    else {
      const fetched = cats ?? []
      setCategories(fetched)
      // First category expanded, rest collapsed — only on initial load
      setCollapsed(prev => {
        // If we already have state (re-fetch after edit), preserve it
        if (prev.size > 0 || fetched.length === 0) return prev
        const sorted = [...fetched].sort((a, b) =>
          a.sort_order !== b.sort_order ? a.sort_order - b.sort_order
            : (a as any).created_at < (b as any).created_at ? -1 : 1
        )
        return new Set(sorted.slice(1).map(c => c.id))
      })
    }
    if (skErr) showToast(skErr.message, 'error')
    else setSkills(sks ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Move helpers ───────────────────────────────────────────────────────────
  const moveCat = async (id: string, dir: 'up' | 'down') => {
    // Always sort by sort_order asc, created_at asc to get stable index order
    const sorted = [...categories].sort((a, b) =>
      a.sort_order !== b.sort_order
        ? a.sort_order - b.sort_order
        : (a as any).created_at < (b as any).created_at ? -1 : 1
    )
    const idx = sorted.findIndex(c => c.id === id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]

    const [r1, r2] = await Promise.all([
      supabase.from('skill_categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('skill_categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    if (r1.error || r2.error) showToast('Move failed.', 'error')
    await fetchAll()
  }

  const moveSkill = async (id: string, categoryId: string, dir: 'up' | 'down') => {
    // Sort skills within this category by sort_order asc, created_at asc
    const catSkills = skills
      .filter(s => s.category_id === categoryId)
      .sort((a, b) =>
        a.sort_order !== b.sort_order
          ? a.sort_order - b.sort_order
          : (a as any).created_at < (b as any).created_at ? -1 : 1
      )

    const idx = catSkills.findIndex(s => s.id === id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= catSkills.length) return

    const a = catSkills[idx]
    const b = catSkills[swapIdx]

    const [r1, r2] = await Promise.all([
      supabase.from('skills').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('skills').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    if (r1.error || r2.error) showToast('Move failed.', 'error')
    await fetchAll()
  }

  // ── Category CRUD ──────────────────────────────────────────────────────────
  const startEditCat = (cat: Category) => {
    setEditingCat(cat.id)
    setCatDraft({ title: cat.title ?? '' })
  }

  const saveCategory = async () => {
    if (!editingCat || !catDraft.title.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('skill_categories')
      .update({ title: catDraft.title.trim() })
      .eq('id', editingCat)
    setSaving(false)
    if (error) showToast(error.message, 'error')
    else { showToast('Category updated.'); setEditingCat(null); fetchAll() }
  }

  const createCategory = async () => {
    if (!newCatTitle.trim()) return
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0)
    setSaving(true)
    const { error } = await supabase
      .from('skill_categories')
      .insert({ title: newCatTitle.trim(), sort_order: maxOrder + 1 })
    setSaving(false)
    if (error) showToast(error.message, 'error')
    else { showToast('Category created.'); setNewCatTitle(''); fetchAll() }
  }

  const deleteCategory = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('skill_categories').delete().eq('id', id)
    setDeleting(false)
    setConfirmDeleteCat(null)
    if (error) showToast(error.message, 'error')
    else { showToast('Category and all its skills deleted.'); fetchAll() }
  }

  // ── Skill CRUD ─────────────────────────────────────────────────────────────
  const startEditSkill = (skill: Skill) => {
    setEditingSkill(skill.id)
    setSkillDraft({ name: skill.name ?? '' })
  }

  const saveSkill = async () => {
    if (!editingSkill || !skillDraft.name.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('skills')
      .update({ name: skillDraft.name.trim() })
      .eq('id', editingSkill)
    setSaving(false)
    if (error) showToast(error.message, 'error')
    else { showToast('Skill updated.'); setEditingSkill(null); fetchAll() }
  }

  const createSkill = async (categoryId: string) => {
    if (!newSkillName.trim()) return
    const catSkills = skills.filter(s => s.category_id === categoryId)
    const maxOrder = catSkills.reduce((m, s) => Math.max(m, s.sort_order), 0)
    setSaving(true)
    const { error } = await supabase
      .from('skills')
      .insert({ name: newSkillName.trim(), category_id: categoryId, sort_order: maxOrder + 1 })
    setSaving(false)
    if (error) showToast(error.message, 'error')
    else { showToast('Skill added.'); setNewSkillName(''); setAddingSkillFor(null); fetchAll() }
  }

  const deleteSkill = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('skills').delete().eq('id', id)
    setDeleting(false)
    setConfirmDeleteSkill(null)
    if (error) showToast(error.message, 'error')
    else { showToast('Skill deleted.'); fetchAll() }
  }

  // ── Collapse helpers ───────────────────────────────────────────────────────
  const toggleCollapse = (id: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const expandAll  = () => setCollapsed(new Set())
  const collapseAll = () => setCollapsed(new Set(categories.map(c => c.id)))

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls = 'w-full bg-white/[0.06] border border-white/[0.14] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors'
  const btnPrimary = 'text-xs px-4 py-1.5 bg-white/[0.09] hover:bg-white/[0.14] border border-white/[0.14] text-white rounded-lg transition-colors disabled:opacity-40'
  const btnGhost = 'text-xs text-white/35 hover:text-white/65 transition-colors px-2'
  const btnDanger = 'text-xs px-3 py-1 bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.07] hover:border-red-500/25 text-white/25 hover:text-red-400 rounded-lg transition-colors'

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-6 sm:pb-0">
      <h2 className="text-base lg:text-lg font-medium text-white mb-6">Skills</h2>

      {/* ── Expand / Collapse all ── */}
      {categories.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <button onClick={expandAll}
            className="text-xs lg:text-sm text-white/35 hover:text-white/65 transition-colors">
            Expand all
          </button>
          <span className="text-white/15">·</span>
          <button onClick={collapseAll}
            className="text-xs lg:text-sm text-white/35 hover:text-white/65 transition-colors">
            Collapse all
          </button>
        </div>
      )}

      {/* ── Category list ── */}
      <div className="space-y-4">
        {[...categories]
          .sort((a, b) =>
            a.sort_order !== b.sort_order
              ? a.sort_order - b.sort_order
              : (a as any).created_at < (b as any).created_at ? -1 : 1
          )
          .map((cat, catIdx, sortedCats) => {
          const catSkills = skills
            .filter(s => s.category_id === cat.id)
            .sort((a, b) =>
              a.sort_order !== b.sort_order
                ? a.sort_order - b.sort_order
                : (a as any).created_at < (b as any).created_at ? -1 : 1
            )

          const isCollapsed = collapsed.has(cat.id)

          return (
            <div key={cat.id} className="border border-white/[0.08] rounded-xl overflow-hidden">

              {/* Category header — view */}
              {editingCat !== cat.id ? (
                <div className="px-4 py-3 bg-white/[0.03]">
                  {/* Row 1: move arrows + title/count/chevron */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Move arrows */}
                    <div className="flex gap-1 flex-shrink-0">
                      <MoveBtn dir="up"   disabled={catIdx === 0}                     onClick={() => moveCat(cat.id, 'up')} />
                      <MoveBtn dir="down" disabled={catIdx === sortedCats.length - 1} onClick={() => moveCat(cat.id, 'down')} />
                    </div>

                    {/* Title + count + chevron */}
                    <button
                      onClick={() => toggleCollapse(cat.id)}
                      className="flex-1 min-w-0 flex items-center gap-2 text-left group"
                    >
                      <span className="text-sm lg:text-base font-medium text-white/85 group-hover:text-white transition-colors truncate">
                        {cat.title}
                      </span>
                      <span className="text-[10px] lg:text-xs text-white/30 font-medium tabular-nums flex-shrink-0">
                        {catSkills.length} {catSkills.length === 1 ? 'skill' : 'skills'}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 text-white/30 group-hover:text-white/55 transition-all duration-200 flex-shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Action buttons — inline on sm+, hidden on mobile (shown in row 2) */}
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEditCat(cat)}
                        className="text-xs lg:text-sm px-3 lg:px-4 py-1.5 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/55 hover:text-white rounded-lg transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => { setAddingSkillFor(addingSkillFor === cat.id ? null : cat.id); setNewSkillName('') }}
                        className="text-xs lg:text-sm px-3 lg:px-4 py-1.5 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/55 hover:text-white rounded-lg transition-colors">
                        + Add Skill
                      </button>
                      {confirmDeleteCat === cat.id ? (
                        <span className="flex items-center gap-2 text-xs lg:text-sm">
                          <span className="text-white/35 whitespace-nowrap">Delete all?</span>
                          <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors whitespace-nowrap">Yes</button>
                          <button onClick={() => setConfirmDeleteCat(null)} className={btnGhost}>Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteCat(cat.id)} className={btnDanger}>Delete</button>
                      )}                    </div>
                  </div>

                  {/* Row 2: action buttons — mobile only */}
                  <div className="flex sm:hidden items-center gap-2 mt-2.5 flex-wrap">
                    <button onClick={() => startEditCat(cat)}
                      className="text-xs px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/55 hover:text-white rounded-lg transition-colors">
                      Edit
                    </button>
                    <button
                      onClick={() => { setAddingSkillFor(addingSkillFor === cat.id ? null : cat.id); setNewSkillName('') }}
                      className="text-xs px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-white/55 hover:text-white rounded-lg transition-colors">
                      + Add Skill
                    </button>
                    {confirmDeleteCat === cat.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-white/35">Delete category + all skills?</span>
                        <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">Yes, delete all</button>
                        <button onClick={() => setConfirmDeleteCat(null)} className={btnGhost}>Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDeleteCat(cat.id)} className={btnDanger}>Delete</button>
                    )}
                  </div>
                </div>
              ) : (
                /* Category header — edit */
                <div className="px-4 py-3 bg-white/[0.04] space-y-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Category Title</label>
                    <input autoFocus type="text" value={catDraft.title}
                      onChange={e => setCatDraft({ title: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') saveCategory(); if (e.key === 'Escape') setEditingCat(null) }}
                      className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveCategory} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditingCat(null)} className={btnGhost}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Add skill form — only when expanded */}
              {!isCollapsed && addingSkillFor === cat.id && (
                <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02] space-y-3">
                  <p className="text-xs text-white/40">Add skill to <span className="text-white/65">{cat.title}</span></p>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Skill Name</label>
                    <input autoFocus type="text" placeholder="e.g. TypeScript" value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createSkill(cat.id); if (e.key === 'Escape') setAddingSkillFor(null) }}
                      className={inputCls} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => createSkill(cat.id)} disabled={saving} className={btnPrimary}>{saving ? 'Adding…' : 'Add Skill'}</button>
                    <button onClick={() => setAddingSkillFor(null)} className={btnGhost}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Skills list — only when expanded */}
              {!isCollapsed && (catSkills.length === 0 ? (
                <p className="px-4 py-3 text-xs text-white/25 border-t border-white/[0.06]">
                  No skills yet — click "+ Add Skill" above.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {catSkills.map((skill, skillIdx) => (
                    <div key={skill.id} className="px-4 py-3">
                      {editingSkill !== skill.id ? (
                        /* Skill row — view */

                        /* ── Desktop/tablet (sm+): single row with text buttons ── */
                        <div className="hidden sm:flex sm:items-center gap-2">
                          <div className="flex gap-1 flex-shrink-0">
                            <MoveBtn dir="up"   disabled={skillIdx === 0}                    onClick={() => moveSkill(skill.id, cat.id, 'up')} />
                            <MoveBtn dir="down" disabled={skillIdx === catSkills.length - 1} onClick={() => moveSkill(skill.id, cat.id, 'down')} />
                          </div>
                          <span className="flex-1 text-sm lg:text-base text-white/70 min-w-0 truncate">{skill.name}</span>
                          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                            <button onClick={() => startEditSkill(skill)}
                              className="text-xs lg:text-sm px-3 lg:px-4 py-1 lg:py-1.5 bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-white/45 hover:text-white rounded-lg transition-colors">
                              Edit
                            </button>
                            {confirmDeleteSkill === skill.id ? (
                              <span className="flex items-center gap-1.5 text-xs lg:text-sm">
                                <button onClick={() => deleteSkill(skill.id)} className="text-red-400 hover:text-red-300 transition-colors">Confirm</button>
                                <button onClick={() => setConfirmDeleteSkill(null)} className={btnGhost}>Cancel</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmDeleteSkill(skill.id)} className={btnDanger}>Delete</button>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {editingSkill !== skill.id ? (
                        /* ── Mobile (<sm): stacked — name on top, icon actions below ── */
                        <div className="sm:hidden space-y-2 py-1">
                          {/* Row 1: skill name */}
                          <span className="block text-sm text-white/75 min-w-0 truncate">{skill.name}</span>
                          {/* Row 2: left = edit/delete, right = move up/down */}
                          {confirmDeleteSkill === skill.id ? (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-white/35">Delete?</span>
                              <button onClick={() => deleteSkill(skill.id)} className="text-red-400 hover:text-red-300 font-medium transition-colors">Yes</button>
                              <button onClick={() => setConfirmDeleteSkill(null)} className="text-white/35 hover:text-white/65 transition-colors">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-2">
                              {/* Left: Edit + Delete */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEditSkill(skill)}
                                  title="Edit skill"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.10] text-white/40 hover:text-white/80 hover:border-white/25 hover:bg-white/[0.05] transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteSkill(skill.id)}
                                  title="Delete skill"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.07] text-white/25 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/[0.08] transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              {/* Right: Move up + Move down */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => moveSkill(skill.id, cat.id, 'up')}
                                  disabled={skillIdx === 0}
                                  title="Move up"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.14] text-white/45 hover:text-white/80 hover:border-white/30 hover:bg-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => moveSkill(skill.id, cat.id, 'down')}
                                  disabled={skillIdx === catSkills.length - 1}
                                  title="Move down"
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.14] text-white/45 hover:text-white/80 hover:border-white/30 hover:bg-white/[0.06] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Skill row — edit */
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-white/40 mb-1">Skill Name</label>
                            <input autoFocus type="text" value={skillDraft.name}
                              onChange={e => setSkillDraft({ name: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') saveSkill(); if (e.key === 'Escape') setEditingSkill(null) }}
                              className={inputCls} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveSkill} disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
                            <button onClick={() => setEditingSkill(null)} className={btnGhost}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* ── New category form ── */}
      <div className="mt-6 border border-white/[0.07] rounded-xl px-4 py-4">
        <p className="text-xs text-white/40 font-medium mb-3">New Category</p>
        <div className="flex gap-3">
          <input type="text" placeholder="e.g. DevOps" value={newCatTitle}
            onChange={e => setNewCatTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createCategory() }}
            className={inputCls} />
          <button onClick={createCategory} disabled={saving}
            className="shrink-0 text-xs px-4 py-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white rounded-lg transition-colors disabled:opacity-40">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}

      {confirmDeleteCat && (
        <ConfirmDialog
          title="Delete category?"
          description={`"${categories.find(c => c.id === confirmDeleteCat)?.title ?? 'This category'}" will be permanently removed.`}
          warning="This will also delete all skills inside this category."
          confirmLabel="Delete category"
          loading={deleting}
          onConfirm={() => deleteCategory(confirmDeleteCat)}
          onCancel={() => setConfirmDeleteCat(null)}
        />
      )}

      {confirmDeleteSkill && (
        <ConfirmDialog
          title="Delete skill?"
          description={`"${skills.find(s => s.id === confirmDeleteSkill)?.name ?? 'This skill'}" will be permanently removed.`}
          confirmLabel="Delete skill"
          loading={deleting}
          onConfirm={() => deleteSkill(confirmDeleteSkill)}
          onCancel={() => setConfirmDeleteSkill(null)}
        />
      )}
    </div>
  )
}
