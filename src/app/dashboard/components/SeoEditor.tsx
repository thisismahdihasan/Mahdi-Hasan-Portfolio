'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Toast from './Toast'
import { revalidateHomepage } from '@/lib/revalidate'

// ── Constants ────────────────────────────────────────────────────────────────
const SEO_KEY = ['dashboard-seo-settings'] as const
const MAX_IMG_BYTES = 8 * 1024 * 1024 // 8 MB
const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMG_EXTS  = ['.jpg', '.jpeg', '.png', '.webp']

// Fixed path — every upload overwrites the same file (upsert behaviour)
const OG_IMAGE_PATH = 'og-image.jpg'

// ── Types ────────────────────────────────────────────────────────────────────
interface SeoRow {
  id:              number
  seo_title:       string | null
  seo_description: string | null
  og_image_url:    string | null
  updated_at:      string | null
}

type ToastState  = { message: string; type: 'success' | 'error' } | null
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done';  filename: string }
  | { status: 'error'; message: string }

// ── Shared input styles (identical to HeroEditor) ────────────────────────────
const inputCls =
  'w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors'
const textareaCls =
  'w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none'

// ── Fetch ────────────────────────────────────────────────────────────────────
async function fetchSeoSettings(): Promise<SeoRow | null> {
  const { data, error } = await supabase
    .from('seo_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data ?? null
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SeoEditor() {
  const queryClient = useQueryClient()

  const { data: dbRow, isLoading, error: fetchError } = useQuery({
    queryKey: SEO_KEY,
    queryFn:  fetchSeoSettings,
  })

  const [form, setForm] = useState({
    seo_title:       '',
    seo_description: '',
    og_image_url:    '',
  })
  const [dirty,    setDirty]   = useState(false)
  const [saving,   setSaving]  = useState(false)
  const [toast,    setToast]   = useState<ToastState>(null)
  const [imgUpload, setImgUpload] = useState<UploadState>({ status: 'idle' })
  const imgInputRef = useRef<HTMLInputElement>(null)

  // Populate form when DB row loads
  useEffect(() => {
    if (dbRow !== undefined) {
      setForm({
        seo_title:       dbRow?.seo_title       ?? '',
        seo_description: dbRow?.seo_description ?? '',
        og_image_url:    dbRow?.og_image_url     ?? '',
      })
      setDirty(false)
    }
  }, [dbRow])

  const set = useCallback((field: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    setDirty(true)
  }, [])

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setToast(null)

    const payload = {
      id:              1,
      seo_title:       form.seo_title.trim()       || null,
      seo_description: form.seo_description.trim() || null,
      og_image_url:    form.og_image_url.trim()    || null,
      updated_at:      new Date().toISOString(),
    }

    const { error } = await supabase
      .from('seo_settings')
      .upsert(payload, { onConflict: 'id' })

    setSaving(false)

    if (error) {
      setToast({ message: `Save failed: ${error.message}`, type: 'error' })
      return
    }

    await queryClient.invalidateQueries({ queryKey: SEO_KEY })
    setDirty(false)

    const revalidated = await revalidateHomepage()
    setToast({
      message: revalidated
        ? 'SEO settings saved. Public site metadata updated.'
        : 'SEO settings saved. Public site will refresh within 5 minutes.',
      type: 'success',
    })
  }

  const handleReset = () => {
    if (dbRow === undefined) return
    setForm({
      seo_title:       dbRow?.seo_title       ?? '',
      seo_description: dbRow?.seo_description ?? '',
      og_image_url:    dbRow?.og_image_url     ?? '',
    })
    setDirty(false)
    setImgUpload({ status: 'idle' })
  }

  // ── OG image upload (upsert — always overwrites og-image.jpg) ────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (imgInputRef.current) imgInputRef.current.value = ''
    if (!file) return

    const isAllowed =
      ALLOWED_IMG_TYPES.includes(file.type) ||
      ALLOWED_IMG_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!isAllowed) {
      setImgUpload({ status: 'error', message: 'Only JPG, PNG, or WebP images are accepted.' })
      return
    }
    if (file.size > MAX_IMG_BYTES) {
      setImgUpload({
        status: 'error',
        message: `File too large — maximum is 8 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      })
      return
    }

    setImgUpload({ status: 'uploading' })

    // Upsert: always writes to the same fixed path, replacing any previous upload
    const { error: uploadError } = await supabase.storage
      .from('seo-images')
      .upload(OG_IMAGE_PATH, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setImgUpload({ status: 'error', message: uploadError.message })
      return
    }

    // Cache-bust so CDN and browsers fetch the new image immediately
    const { data } = supabase.storage.from('seo-images').getPublicUrl(OG_IMAGE_PATH)
    set('og_image_url', `${data.publicUrl}?v=${Date.now()}`)
    setImgUpload({ status: 'done', filename: file.name })
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-5 h-5 border-2 border-white/20 border-t-[#D4AF37]/70 rounded-full animate-spin" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-[#1a0f0f] p-6">
        <p className="text-sm text-red-400">
          Failed to load SEO settings: {(fetchError as Error).message}
        </p>
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

      <div className="space-y-7 w-full max-w-[720px]">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-1">
              SEO
            </p>
            <h2 className="text-xl font-semibold text-white/90">SEO Settings</h2>
            <p className="text-sm text-white/30 mt-1">
              Override public metadata for search engines and social sharing.
              Leave a field empty to use the built-in default.
            </p>
          </div>

          {/* Dirty indicator */}
          <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold uppercase tracking-wider transition-colors ${
            dirty
              ? 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.08] text-[#D4AF37]'
              : 'border-white/[0.08] bg-white/[0.03] text-white/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dirty ? 'bg-[#D4AF37]' : 'bg-white/20'}`} />
            {dirty ? 'Unsaved' : 'Saved'}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">

          {/* ── SEO Fields card ── */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7 space-y-6">
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30">
              Browser &amp; Search
            </p>

            {/* SEO Title */}
            <div>
              <label className="block text-xs text-white/45 mb-2">
                SEO Title
              </label>
              <input
                type="text"
                value={form.seo_title}
                onChange={e => set('seo_title', e.target.value)}
                placeholder="Mahdi Hasan | Junior Frontend Developer"
                maxLength={120}
                className={inputCls}
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-white/20">
                  Recommended: 50–60 characters. Leave empty to use the built-in title.
                </p>
                <p className={`text-[11px] tabular-nums flex-shrink-0 ml-3 ${
                  form.seo_title.length > 60
                    ? 'text-amber-400/70'
                    : 'text-white/20'
                }`}>
                  {form.seo_title.length}/60
                </p>
              </div>
            </div>

            {/* SEO Description */}
            <div>
              <label className="block text-xs text-white/45 mb-2">
                SEO Description
              </label>
              <textarea
                value={form.seo_description}
                onChange={e => set('seo_description', e.target.value)}
                placeholder="Junior Frontend Developer specializing in React, Next.js, and Tailwind CSS…"
                rows={3}
                maxLength={320}
                className={textareaCls}
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-white/20">
                  Recommended: 150–160 characters. Leave empty to use the built-in description.
                </p>
                <p className={`text-[11px] tabular-nums flex-shrink-0 ml-3 ${
                  form.seo_description.length > 160
                    ? 'text-amber-400/70'
                    : 'text-white/20'
                }`}>
                  {form.seo_description.length}/160
                </p>
              </div>
            </div>
          </div>

          {/* ── OG Image card ── */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7 space-y-5">
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30">
              Open Graph / Social Image
            </p>

            {/* Current image preview */}
            <div className="flex items-start gap-4">
              <div className="w-[120px] h-[63px] rounded-lg overflow-hidden border border-white/[0.10] bg-white/[0.04] flex-shrink-0 relative">
                {form.og_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.og_image_url}
                    alt="OG image preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/15 text-[20px]">image</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-xs text-white/50 leading-relaxed">
                  {form.og_image_url
                    ? 'Custom OG image active.'
                    : 'No custom image — public site uses the auto-generated OG image.'}
                </p>

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
                      <span className="material-symbols-outlined text-[14px]">upload</span>
                      {form.og_image_url ? 'Replace Image' : 'Upload Image'}
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

            {/* URL field — also editable directly */}
            <div>
              <label className="block text-xs text-white/45 mb-2">
                OG Image URL
              </label>
              <input
                type="text"
                value={form.og_image_url}
                onChange={e => {
                  set('og_image_url', e.target.value)
                  if (imgUpload.status === 'done') setImgUpload({ status: 'idle' })
                }}
                placeholder="https://… (auto-filled after upload)"
                className={inputCls}
              />
              <p className="text-[11px] text-white/20 mt-1.5">
                Recommended: 1200×630 px, JPG or PNG. Upload replaces the previous image automatically.
                Leave empty to use the auto-generated OG image.
              </p>
            </div>
          </div>

          {/* ── Save bar ── */}
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

        {/* ISR notice */}
        <div className="rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] p-5">
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-[#D4AF37]/60 text-[18px] flex-shrink-0 mt-0.5">
              schedule
            </span>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#D4AF37]/80">Live updates</p>
              <p className="text-[11px] text-[#D4AF37]/50 leading-relaxed">
                Saving triggers instant revalidation of the public site metadata.
                Changes to title, description, and OG image appear on the next page load.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
