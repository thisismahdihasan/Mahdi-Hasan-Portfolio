'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardSelect from './DashboardSelect'

export interface ProjectRow {
  id?: string
  title: string
  slug: string
  category: string
  short_description: string
  full_description: string
  image_url: string
  live_url: string
  github_url: string
  tech_stack: string[]
  status: 'published' | 'draft'
  sort_order: number
}

const EMPTY: ProjectRow = {
  title: '', slug: '', category: 'frontend',
  short_description: '', full_description: '',
  image_url: '', live_url: '', github_url: '',
  tech_stack: [], status: 'draft', sort_order: 0,
}

interface Props {
  initial?: ProjectRow
  initialSortOrder?: number   // max existing + 1, passed from manager
  onSaved: (msg: string) => void
  onCancel: () => void
}

// Convert a title into a URL-safe slug
const toSlug = (title: string) =>
  title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Extract storage path from a Supabase public URL
const storagePathFromUrl = (url: string, bucket: string): string | null => {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = url.indexOf(marker)
    return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
  } catch {
    return null
  }
}

const inputCls = 'w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors'
const inputErrCls = 'w-full bg-white/[0.05] border border-red-500/40 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/60 transition-colors'

export default function ProjectForm({ initial, initialSortOrder, onSaved, onCancel }: Props) {
  const isNew = !initial?.id

  const [form, setForm] = useState<ProjectRow>(() => {
    // Normalize all string fields from DB — null → "" so controlled inputs never receive null
    const base = initial ?? EMPTY
    return {
      ...base,
      title:             base.title             ?? '',
      slug:              base.slug              ?? '',
      category:          base.category          ?? 'frontend',
      short_description: base.short_description ?? '',
      full_description:  base.full_description  ?? '',
      image_url:         base.image_url         ?? '',
      live_url:          base.live_url          ?? '',
      github_url:        base.github_url        ?? '',
      tech_stack:        Array.isArray(base.tech_stack) ? base.tech_stack : [],
      status:            base.status            ?? 'draft',
      sort_order:        base.sort_order        ?? initialSortOrder ?? 0,
    }
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectRow, string>>>({})
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof ProjectRow, value: unknown) => {
    setForm(f => ({ ...f, [field]: value }))
    // Clear field error on change
    if (fieldErrors[field]) setFieldErrors(e => ({ ...e, [field]: undefined }))
  }

  const handleTitleChange = (value: string) => {
    set('title', value)
    if (!slugManuallyEdited) {
      setForm(f => ({ ...f, title: value, slug: toSlug(value) }))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    set('slug', value)
  }

  const validate = (): boolean => {
    const errors: Partial<Record<keyof ProjectRow, string>> = {}
    if (!form.title.trim())             errors.title             = 'Title is required.'
    if (!form.slug.trim())              errors.slug              = 'Slug is required.'
    if (!form.category.trim())          errors.category          = 'Category is required.'
    if (!form.short_description.trim()) errors.short_description = 'Short description is required.'
    if (!form.image_url.trim())         errors.image_url         = 'Image URL is required. Upload an image or enter a URL.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const slug = form.slug.trim() || 'project'
    const ext = file.name.split('.').pop() ?? 'webp'
    const path = `projects/${slug}-${Date.now()}.${ext}`

    setUploading(true)
    setUploadMsg(null)

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setUploadMsg({ text: uploadError.message, ok: false })
      return
    }

    const { data } = supabase.storage.from('project-images').getPublicUrl(path)
    set('image_url', data.publicUrl)
    setUploading(false)
    setUploadMsg({ text: 'Image uploaded.', ok: true })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setSubmitErr(null)

    // Strip id from payload for insert
    const { id, ...rest } = form
    const payload = { ...rest, slug: form.slug.trim() }

    const { error } = id
      ? await supabase.from('projects').update(payload).eq('id', id)
      : await supabase.from('projects').insert(payload)

    setSaving(false)
    if (error) { setSubmitErr(error.message); return }
    onSaved(id ? 'Project updated.' : 'Project created.')
  }

  // ── Field helpers ──────────────────────────────────────────────────────────
  const fieldBlock = (
    label: string,
    key: keyof ProjectRow,
    type = 'text',
    placeholder = '',
    required = false,
  ) => (
    <div>
      <label className="block text-xs text-white/45 mb-1">
        {label}{required && <span className="text-red-400/70 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(form[key] as string) ?? ''}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className={fieldErrors[key] ? inputErrCls : inputCls}
      />
      {fieldErrors[key] && <p className="text-xs text-red-400/75 mt-1">{fieldErrors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Title + Slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/45 mb-1">
            Title<span className="text-red-400/70 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="My Project"
            className={fieldErrors.title ? inputErrCls : inputCls}
          />
          {fieldErrors.title && <p className="text-xs text-red-400/75 mt-1">{fieldErrors.title}</p>}
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1">
            Slug<span className="text-red-400/70 ml-0.5">*</span>
            {isNew && !slugManuallyEdited && (
              <span className="ml-1.5 text-white/25 font-normal">(auto)</span>
            )}
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={e => handleSlugChange(e.target.value)}
            placeholder="my-project"
            className={fieldErrors.slug ? inputErrCls : inputCls}
          />
          {fieldErrors.slug && <p className="text-xs text-red-400/75 mt-1">{fieldErrors.slug}</p>}
        </div>
      </div>

      {/* Category / Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/45 mb-1">
            Category<span className="text-red-400/70 ml-0.5">*</span>
          </label>
          <DashboardSelect
            value={form.category}
            onChange={v => set('category', v)}
            options={[
              { value: 'frontend', label: 'Frontend' },
              { value: 'client',   label: 'Client' },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1">Status</label>
          <DashboardSelect
            value={form.status}
            onChange={v => set('status', v as 'published' | 'draft')}
            options={[
              { value: 'draft',     label: 'Draft' },
              { value: 'published', label: 'Published' },
            ]}
          />
        </div>
      </div>

      {/* Short description */}
      {fieldBlock('Short Description', 'short_description', 'text', 'One-liner summary', true)}

      {/* Full description */}
      <div>
        <label className="block text-xs text-white/45 mb-1">Full Description</label>
        <textarea
          value={form.full_description ?? ''}
          onChange={e => set('full_description', e.target.value)}
          rows={3}
          placeholder="Detailed project description…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Image + Live URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-white/45 mb-1">
            Image URL<span className="text-red-400/70 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={form.image_url ?? ''}
            onChange={e => set('image_url', e.target.value)}
            placeholder="/project.webp or https://…"
            className={fieldErrors.image_url ? inputErrCls : inputCls}
          />
          {fieldErrors.image_url && (
            <p className="text-xs text-red-400/75 mt-1">{fieldErrors.image_url}</p>
          )}
          {/* Upload */}
          <div className="mt-2 flex items-center gap-2">
            <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg border transition-colors
              ${uploading
                ? 'border-white/[0.08] text-white/25 cursor-not-allowed'
                : 'border-white/[0.12] text-white/50 hover:text-white hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08]'
              }`}>
              {uploading ? 'Uploading…' : 'Upload image'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {uploadMsg && (
              <span className={`text-xs ${uploadMsg.ok ? 'text-green-400/80' : 'text-red-400/80'}`}>
                {uploadMsg.text}
              </span>
            )}
          </div>
          {/* Preview */}
          {form.image_url && (
            <div className="mt-2 w-full h-24 rounded-lg overflow-hidden border border-white/[0.08] bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="preview" className="w-full h-full object-cover object-center" />
            </div>
          )}
        </div>
        {fieldBlock('Live URL', 'live_url', 'url', 'https://')}
      </div>

      {fieldBlock('GitHub URL', 'github_url', 'url', 'https://github.com/…')}

      {/* Tech stack */}
      <div>
        <label className="block text-xs text-white/45 mb-1">Tech Stack (comma-separated)</label>
        <input
          type="text"
          value={form.tech_stack.join(', ')}
          onChange={e =>
            set('tech_stack', e.target.value.split(',').map(s => s.trim()).filter(Boolean))
          }
          placeholder="React, Tailwind CSS, Node.js"
          className={inputCls}
        />
      </div>

      {submitErr && <p className="text-xs text-red-400/80">{submitErr}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-5 py-2 bg-white/[0.09] hover:bg-white/[0.14] border border-white/[0.14] text-white text-sm rounded-lg transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : form.id ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Export helper so ProjectsManager can use it for delete cleanup
export { storagePathFromUrl }
