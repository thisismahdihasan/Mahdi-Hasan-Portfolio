'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import ProjectForm, { type ProjectRow, storagePathFromUrl } from './ProjectForm'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'

type ToastState = { message: string; type: 'success' | 'error' } | null

const QUERY_KEY = ['dashboard-projects'] as const

async function fetchProjectsFromDB(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, slug, category, short_description, full_description, image_url, live_url, github_url, tech_stack, status, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ProjectRow[]
}

export default function ProjectsManager() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY })

  const { data: projects = [], isLoading, isError, error: queryError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchProjectsFromDB,
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime:   10 * 60 * 1000,   // 10 minutes
    placeholderData: (prev) => prev, // keep previous data while refetching
  })

  const [editing, setEditing] = useState<ProjectRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') =>
    setToast({ message, type })

  const handleSaved = (msg: string) => {
    setEditing(null)
    setCreating(false)
    showToast(msg)
    invalidate()
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const project = projects.find(p => p.id === id)
    if (project?.image_url) {
      const storagePath = storagePathFromUrl(project.image_url, 'project-images')
      if (storagePath) {
        await supabase.storage.from('project-images').remove([storagePath])
      }
    }
    const { error } = await supabase.from('projects').delete().eq('id', id)
    setDeleting(false)
    setConfirmDelete(null)
    if (error) showToast(error.message, 'error')
    else { showToast('Project deleted.'); invalidate() }
  }

  const toggleStatus = async (project: ProjectRow) => {
    const next = project.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('projects').update({ status: next }).eq('id', project.id!)
    if (error) showToast(error.message, 'error')
    else { showToast(`Marked as ${next}.`); invalidate() }
  }

  const moveProject = async (id: string, dir: 'up' | 'down') => {
    const sorted = [...projects].sort((a, b) =>
      a.sort_order !== b.sort_order
        ? a.sort_order - b.sort_order
        : ((a as any).created_at < (b as any).created_at ? -1 : 1)
    )
    const idx = sorted.findIndex(p => p.id === id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]

    const [r1, r2] = await Promise.all([
      supabase.from('projects').update({ sort_order: b.sort_order }).eq('id', a.id!),
      supabase.from('projects').update({ sort_order: a.sort_order }).eq('id', b.id!),
    ])
    if (r1.error || r2.error) showToast('Move failed.', 'error')
    invalidate()
  }

  // ── Form view ──────────────────────────────────────────────────────────────
  if (creating || editing) {
    return (
      <div>
        <button
          onClick={() => { setCreating(false); setEditing(null) }}
          className="text-xs lg:text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
        >
          ← Back to projects
        </button>
        <h2 className="text-base lg:text-lg font-medium text-white mb-6">
          {editing ? 'Edit Project' : 'New Project'}
        </h2>
        <ProjectForm
          initial={editing ?? undefined}
          initialSortOrder={editing ? undefined : Math.max(0, ...projects.map(p => p.sort_order)) + 1}
          onSaved={handleSaved}
          onCancel={() => { setCreating(false); setEditing(null) }}
        />
        {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base lg:text-lg font-medium text-white">Projects</h2>
        <button
          onClick={() => setCreating(true)}
          className="text-xs lg:text-sm px-4 lg:px-5 py-2 lg:py-2.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white rounded-lg transition-colors"
        >
          + New Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-400/70 text-center py-16">{(queryError as Error)?.message ?? 'Failed to load projects.'}</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-16">No projects yet.</p>
      ) : (
        <div className="space-y-2">
          {/* Header row — hidden on mobile */}
          <div className="hidden sm:grid grid-cols-[32px_1fr_100px_90px_auto] gap-3 px-4 pb-1 text-xs lg:text-[13px] text-white/30 uppercase tracking-wider">
            <span />
            <span>Title</span>
            <span>Category</span>
            <span>Status</span>
            <span />
          </div>

          {[...projects]
            .sort((a, b) =>
              a.sort_order !== b.sort_order
                ? a.sort_order - b.sort_order
                : ((a as any).created_at < (b as any).created_at ? -1 : 1)
            )
            .map((p, idx, sorted) => (
            <div
              key={p.id}
              className="grid grid-cols-1 sm:grid-cols-[32px_1fr_100px_90px_auto] gap-2 sm:gap-3 items-center px-4 py-3 lg:py-4 bg-white/[0.03] border border-white/[0.07] rounded-lg"
            >
              {/* Move buttons */}
              <div className="hidden sm:flex flex-col gap-0.5">
                <button
                  onClick={() => moveProject(p.id!, 'up')}
                  disabled={idx === 0}
                  title="Move up"
                  className="w-6 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/70 border border-white/[0.08] hover:border-white/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-[10px]"
                >↑</button>
                <button
                  onClick={() => moveProject(p.id!, 'down')}
                  disabled={idx === sorted.length - 1}
                  title="Move down"
                  className="w-6 h-5 flex items-center justify-center rounded text-white/30 hover:text-white/70 border border-white/[0.08] hover:border-white/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed text-[10px]"
                >↓</button>
              </div>

              {/* Title + slug */}
              <div className="min-w-0">
                <p className="text-sm lg:text-base text-white truncate">{p.title}</p>
                <p className="text-xs lg:text-[13px] text-white/30 truncate">{p.slug}</p>
              </div>

              {/* Category */}
              <span className="text-xs lg:text-sm text-white/45 capitalize">{p.category}</span>

              {/* Status toggle */}
              <button
                onClick={() => toggleStatus(p)}
                className={`text-xs lg:text-sm px-2.5 py-1 rounded-full border w-fit transition-colors ${
                  p.status === 'published'
                    ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                    : 'border-white/15 text-white/35 hover:bg-white/[0.06]'
                }`}
              >
                {p.status}
              </button>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(p)}
                  className="text-xs lg:text-sm text-white/40 hover:text-white/80 px-2 py-1 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(p.id!)}
                  className="text-xs lg:text-sm text-white/25 hover:text-red-400 px-2 py-1 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete project?"
          description={`"${projects.find(p => p.id === confirmDelete)?.title ?? 'This project'}" will be permanently removed.`}
          confirmLabel="Delete project"
          loading={deleting}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
