'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Toast from './Toast'
import type { HeroContent } from '@/types/hero'

const MAX_PDF_BYTES  = 5 * 1024 * 1024 // 5 MB
const MAX_IMG_BYTES  = 8 * 1024 * 1024 // 8 MB

const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMG_EXTS  = ['.jpg', '.jpeg', '.png', '.webp']

// Derive the fixed storage filename from the uploaded file's extension
const profilePhotoPath = (file: File): string => {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.png'))              return 'profile-photo.png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'profile-photo.jpg'
  return 'profile-photo.webp' // default for .webp and anything else accepted
}

// All known fixed filenames — used to clean up the old variant before uploading
const PROFILE_PHOTO_VARIANTS = ['profile-photo.webp', 'profile-photo.jpg', 'profile-photo.png']

// ── Query key ────────────────────────────────────────────────────────────────
const HERO_KEY = ['dashboard-hero-content'] as const

// ── Fallback / empty form state ──────────────────────────────────────────────
const EMPTY: Omit<HeroContent, 'id' | 'updated_at'> = {
  name:                '',
  role:                '',
  description:         '',
  primary_cta_label:   '',
  primary_cta_url:     '',
  secondary_cta_label: '',
  profile_image_url:   '',
}

// ── Fetch from Supabase (JS client, auth-aware) ──────────────────────────────
async function fetchHeroContent(): Promise<HeroContent | null> {
  const { data, error } = await supabase
    .from('hero_content')
    .select('*')
    .eq('id', 1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message) // PGRST116 = no rows
  return data ?? null
}

// ── Shared input class ───────────────────────────────────────────────────────
const inputCls =
  'w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors'
const textareaCls =
  'w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none'

type ToastState = { message: string; type: 'success' | 'error' } | null

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done';  filename: string }
  | { status: 'error'; message: string }

// ── Component ────────────────────────────────────────────────────────────────
export default function HeroEditor() {
  const queryClient = useQueryClient()

  const { data: dbRow, isLoading, error: fetchError } = useQuery({
    queryKey: HERO_KEY,
    queryFn:  fetchHeroContent,
  })

  const [form, setForm] = useState(EMPTY)
  const [dirty, setDirty]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<ToastState>(null)
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' })
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [imgUpload, setImgUpload] = useState<UploadState>({ status: 'idle' })
  const imgInputRef = useRef<HTMLInputElement>(null)

  // Populate form once DB row loads
  useEffect(() => {
    if (dbRow) {
      setForm({
        name:                dbRow.name                ?? '',
        role:                dbRow.role                ?? '',
        description:         dbRow.description         ?? '',
        primary_cta_label:   dbRow.primary_cta_label   ?? '',
        primary_cta_url:     dbRow.primary_cta_url     ?? '',
        secondary_cta_label: dbRow.secondary_cta_label ?? '',
        profile_image_url:   dbRow.profile_image_url   ?? '',
      })
      setDirty(false)
    }
  }, [dbRow])

  const set = useCallback((field: keyof typeof EMPTY, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    setDirty(true)
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setToast(null)

    const payload = {
      id: 1,
      ...form,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('hero_content')
      .upsert(payload, { onConflict: 'id' })

    setSaving(false)

    if (error) {
      setToast({ message: `Save failed: ${error.message}`, type: 'error' })
      return
    }

    // Invalidate TanStack Query cache so re-open shows fresh data
    await queryClient.invalidateQueries({ queryKey: HERO_KEY })
    setDirty(false)
    setToast({ message: 'Hero content saved.', type: 'success' })
  }

  const handleReset = () => {
    if (!dbRow) return
    setForm({
      name:                dbRow.name                ?? '',
      role:                dbRow.role                ?? '',
      description:         dbRow.description         ?? '',
      primary_cta_label:   dbRow.primary_cta_label   ?? '',
      primary_cta_url:     dbRow.primary_cta_url     ?? '',
      secondary_cta_label: dbRow.secondary_cta_label ?? '',
      profile_image_url:   dbRow.profile_image_url   ?? '',
    })
    setDirty(false)
    setUpload({ status: 'idle' })
    setImgUpload({ status: 'idle' })
  }

  // ── PDF upload ────────────────────────────────────────────────────────────
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input immediately so the same file can be re-selected after an error
    if (pdfInputRef.current) pdfInputRef.current.value = ''
    if (!file) return

    // Client-side validation
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setUpload({ status: 'error', message: 'Only PDF files are accepted.' })
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setUpload({ status: 'error', message: `File too large — maximum size is 5 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB).` })
      return
    }

    setUpload({ status: 'uploading' })

    // Fixed path — every upload replaces the same file, no accumulation
    const FIXED_PATH = 'mahdi-hasan-resume.pdf'

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(FIXED_PATH, file, { upsert: true, contentType: 'application/pdf' })

    if (uploadError) {
      setUpload({ status: 'error', message: uploadError.message })
      return
    }

    // Cache-bust so browsers fetch the new file immediately
    const { data } = supabase.storage.from('resumes').getPublicUrl(FIXED_PATH)
    set('primary_cta_url', `${data.publicUrl}?v=${Date.now()}`)
    setUpload({ status: 'done', filename: file.name })
  }

  // ── Profile photo upload ──────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (imgInputRef.current) imgInputRef.current.value = ''
    if (!file) return

    // Validate type
    const isAllowed =
      ALLOWED_IMG_TYPES.includes(file.type) ||
      ALLOWED_IMG_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isAllowed) {
      setImgUpload({ status: 'error', message: 'Only JPG, PNG, or WebP images are accepted.' })
      return
    }
    // Validate size
    if (file.size > MAX_IMG_BYTES) {
      setImgUpload({
        status: 'error',
        message: `File too large — maximum is 8 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      })
      return
    }

    setImgUpload({ status: 'uploading' })

    const newPath = profilePhotoPath(file)

    // Remove all other known variants first so only one file exists in the bucket
    const toRemove = PROFILE_PHOTO_VARIANTS.filter(v => v !== newPath)
    await supabase.storage.from('hero-images').remove(toRemove)

    const { error: uploadError } = await supabase.storage
      .from('hero-images')
      .upload(newPath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setImgUpload({ status: 'error', message: uploadError.message })
      return
    }

    const { data } = supabase.storage.from('hero-images').getPublicUrl(newPath)
    set('profile_image_url', `${data.publicUrl}?v=${Date.now()}`)
    setImgUpload({ status: 'done', filename: file.name })
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-5 h-5 border-2 border-white/20 border-t-[#D4AF37]/70 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Fetch error state ─────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-[#1a0f0f] p-6">
        <p className="text-sm text-red-400">Failed to load hero content: {(fetchError as Error).message}</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="space-y-7 w-full">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-1">
              Home Section
            </p>
            <h2 className="text-xl font-semibold text-white/90">Hero Editor</h2>
            <p className="text-sm text-white/30 mt-1">
              Edit the public hero section. Saves directly to the database.
            </p>
          </div>

          {/* Status pill */}
          <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider transition-colors ${
            dirty
              ? 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] text-[#D4AF37]'
              : 'border-white/[0.08] bg-white/[0.03] text-white/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dirty ? 'bg-[#D4AF37]' : 'bg-white/20'}`} />
            {dirty ? 'Unsaved' : 'Saved'}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-6 items-start">

          {/* ══ LEFT: Editor form ══ */}
          <form onSubmit={handleSave} className="space-y-5">

            {/* Identity card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-5">
                Identity
              </p>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Display Name <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="MAHDI HASAN"
                    required
                    className={inputCls}
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Role / Title <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={e => set('role', e.target.value)}
                    placeholder="Junior Frontend Developer"
                    required
                    className={inputCls}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Bio / Description <span className="text-red-400/60">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Short bio shown below your role…"
                    required
                    rows={5}
                    className={textareaCls}
                  />
                </div>
              </div>
            </div>

            {/* Profile Photo card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-5">
                Profile Photo
              </p>

              <div className="space-y-4">
                {/* Current image preview */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/[0.10] bg-white/[0.04] flex-shrink-0 relative">
                    {form.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.profile_image_url}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-white/20 text-[22px]">person</span>
                        <span className="text-[9px] text-white/20 text-center leading-tight px-1">Local<br/>fallback</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {form.profile_image_url
                          ? 'Current photo from database.'
                          : 'No photo uploaded — public site uses the local fallback image.'}
                      </p>
                    </div>

                    {/* Upload button */}
                    <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs px-3 py-1.5 rounded-lg border transition-colors select-none
                      ${imgUpload.status === 'uploading'
                        ? 'border-white/[0.08] text-white/25 cursor-not-allowed bg-white/[0.02]'
                        : 'border-white/[0.12] text-white/50 hover:text-white hover:border-[#D4AF37]/40 bg-white/[0.04] hover:bg-[#D4AF37]/[0.06]'
                      }`}
                    >
                      {imgUpload.status === 'uploading' ? (
                        <>
                          <span className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[14px]">add_photo_alternate</span>
                          {form.profile_image_url ? 'Replace Photo' : 'Upload Photo'}
                        </>
                      )}
                      <input
                        ref={imgInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        disabled={imgUpload.status === 'uploading'}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Status feedback */}
                    {imgUpload.status === 'done' && (
                      <span className="flex items-center gap-1 text-xs text-green-400/80">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        {imgUpload.filename} uploaded — save to apply
                      </span>
                    )}
                    {imgUpload.status === 'error' && (
                      <span className="flex items-center gap-1 text-xs text-red-400/80">
                        <span className="material-symbols-outlined text-[13px]">error</span>
                        {imgUpload.message}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-white/20 leading-relaxed">
                  Accepted: JPG, PNG, WebP · Max 8 MB. Upload replaces the previous photo automatically.
                </p>
              </div>
            </div>

            {/* CTA card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7">              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-5">
                Call to Action
              </p>

              <div className="space-y-5">
                {/* Primary CTA */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Primary Button Label <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.primary_cta_label}
                    onChange={e => set('primary_cta_label', e.target.value)}
                    placeholder="Download Resume"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Primary Button URL <span className="text-red-400/60">*</span>
                  </label>

                  {/* Manual URL input */}
                  <input
                    type="text"
                    value={form.primary_cta_url}
                    onChange={e => {
                      set('primary_cta_url', e.target.value)
                      // Clear upload status when user edits manually
                      if (upload.status === 'done') setUpload({ status: 'idle' })
                    }}
                    placeholder="/resume.pdf  or  https://…"
                    required
                    className={inputCls}
                  />

                  {/* PDF upload row */}
                  <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
                    <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs px-3 py-1.5 rounded-lg border transition-colors select-none
                      ${upload.status === 'uploading'
                        ? 'border-white/[0.08] text-white/25 cursor-not-allowed bg-white/[0.02]'
                        : 'border-white/[0.12] text-white/50 hover:text-white hover:border-[#D4AF37]/40 bg-white/[0.04] hover:bg-[#D4AF37]/[0.06]'
                      }`}
                    >
                      {upload.status === 'uploading' ? (
                        <>
                          <span className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[14px]">upload_file</span>
                          Upload PDF
                        </>
                      )}
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={upload.status === 'uploading'}
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Status feedback */}
                    {upload.status === 'done' && (
                      <span className="flex items-center gap-1 text-xs text-green-400/80">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        {upload.filename} uploaded
                      </span>
                    )}
                    {upload.status === 'error' && (
                      <span className="flex items-center gap-1 text-xs text-red-400/80">
                        <span className="material-symbols-outlined text-[13px]">error</span>
                        {upload.message}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-white/20 mt-2 leading-relaxed">
                    Upload a PDF to auto-fill the URL, or type a path manually. Max 5 MB.
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.06]" />

                {/* Secondary CTA */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Secondary Button Label <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.secondary_cta_label}
                    onChange={e => set('secondary_cta_label', e.target.value)}
                    placeholder="View Projects"
                    required
                    className={inputCls}
                  />
                  <p className="text-[11px] text-white/20 mt-2 leading-relaxed">
                    This button always scrolls to the Projects section — only the label is editable.
                  </p>
                </div>
              </div>
            </div>

            {/* Save bar */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] px-7 py-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !dirty}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>

              {dirty && !saving && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 text-sm text-white/35 hover:text-white/65 transition-colors"
                >
                  Discard
                </button>
              )}

              {dbRow?.updated_at && !dirty && (
                <span className="text-[11px] text-white/20 ml-auto">
                  Saved{' '}
                  {new Date(dbRow.updated_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </form>

          {/* ══ RIGHT: Preview + info ══ */}
          <div className="space-y-5 lg:sticky lg:top-24">

            {/* Preview card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30">
                  Live Preview
                </p>
                <span className="flex items-center gap-1.5 text-[10px] text-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                  Hero section
                </span>
              </div>

              {/* Simulated hero surface */}
              <div className="relative p-6 bg-gradient-to-br from-white/[0.02] to-transparent">
                {/* Subtle gold glow — mirrors the real hero background feel */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/[0.04] blur-[60px] rounded-full pointer-events-none" />

                <div className="relative space-y-3">
                  {/* Name */}
                  <p className="text-2xl font-extrabold tracking-tighter text-white leading-none">
                    {form.name
                      ? form.name
                      : <span className="text-white/15 font-normal italic text-lg">Display name…</span>
                    }
                  </p>

                  {/* Role */}
                  <p className="text-sm font-medium text-[#D4AF37]/80 leading-snug">
                    {form.role
                      ? form.role
                      : <span className="text-white/15 italic font-normal">Role / title…</span>
                    }
                  </p>

                  {/* Divider */}
                  <div className="w-8 h-px bg-[#D4AF37]/30" />

                  {/* Description */}
                  <p className="text-xs text-white/45 leading-relaxed line-clamp-5">
                    {form.description
                      ? form.description
                      : <span className="text-white/15 italic">Bio description…</span>
                    }
                  </p>

                  {/* CTA buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold bg-[#D4AF37] text-black rounded-md">
                      {form.primary_cta_label || <span className="opacity-50">Primary CTA</span>}
                    </span>
                    <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium border border-white/20 text-white/50 rounded-md">
                      {form.secondary_cta_label || <span className="opacity-50">Secondary CTA</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="px-6 py-3 border-t border-white/[0.05] bg-black/20">
                <p className="text-[10px] text-white/20">
                  Preview reflects current form values — not yet saved to DB.
                </p>
              </div>
            </div>

            {/* ISR cache notice */}
            <div className="rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] p-5">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-[#D4AF37]/60 text-[18px] flex-shrink-0 mt-0.5">
                  schedule
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#D4AF37]/80">Cache notice</p>
                  <p className="text-[11px] text-[#D4AF37]/50 leading-relaxed">
                    The public site caches pages for up to 5 minutes. After saving, changes will appear on the live site after the next cache refresh.
                  </p>
                </div>
              </div>
            </div>

          </div>
          {/* ══ end right column ══ */}

        </div>
      </div>
    </>
  )
}
