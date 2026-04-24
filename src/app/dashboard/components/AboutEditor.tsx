'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Toast from './Toast'
import type { AboutContent } from '@/types/about'
import { revalidateHomepage } from '@/lib/revalidate'

// ── Query key ────────────────────────────────────────────────────────────────
const ABOUT_KEY = ['dashboard-about-content'] as const

// ── Image upload constants ────────────────────────────────────────────────────
const MAX_IMG_BYTES       = 8 * 1024 * 1024 // 8 MB
const ALLOWED_IMG_TYPES   = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMG_EXTS    = ['.jpg', '.jpeg', '.png', '.webp']
const ABOUT_IMG_VARIANTS  = ['about-photo.jpg', 'about-photo.jpeg', 'about-photo.png', 'about-photo.webp']

const aboutPhotoPath = (file: File): string => {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.png'))                          return 'about-photo.png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'about-photo.jpg'
  return 'about-photo.webp'
}

// ── Empty form state ─────────────────────────────────────────────────────────
type FormState = Omit<AboutContent, 'id' | 'updated_at'>

const EMPTY: FormState = {
  section_subtitle:      '',
  intro_before_emphasis: '',
  intro_emphasis:        '',
  intro_after_emphasis:  '',
  highlight_quote:       '',
  current_paragraph:     '',
  core_expertise:        [],
  beyond_code_title:     '',
  beyond_code_paragraph: '',
  beyond_code_tags:      [],
  education_label:       '',
  education_school:      '',
  education_subtitle:    '',
  about_image_url:       '',
}

// ── Fetch ────────────────────────────────────────────────────────────────────
async function fetchAboutContent(): Promise<AboutContent | null> {
  const { data, error } = await supabase
    .from('about_content')
    .select('*')
    .eq('id', 1)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data ?? null
}

// ── Shared styles ────────────────────────────────────────────────────────────
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
export default function AboutEditor() {
  const queryClient = useQueryClient()

  const { data: dbRow, isLoading, error: fetchError } = useQuery({
    queryKey: ABOUT_KEY,
    queryFn:  fetchAboutContent,
  })

  const [form, setForm]   = useState<FormState>(EMPTY)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<ToastState>(null)
  const [imgUpload, setImgUpload] = useState<UploadState>({ status: 'idle' })
  const imgInputRef = useRef<HTMLInputElement>(null)

  // Populate form once DB row loads
  useEffect(() => {
    if (dbRow) {
      setForm({
        section_subtitle:      dbRow.section_subtitle      ?? '',
        intro_before_emphasis: dbRow.intro_before_emphasis ?? '',
        intro_emphasis:        dbRow.intro_emphasis        ?? '',
        intro_after_emphasis:  dbRow.intro_after_emphasis  ?? '',
        highlight_quote:       dbRow.highlight_quote       ?? '',
        current_paragraph:     dbRow.current_paragraph     ?? '',
        core_expertise:        Array.isArray(dbRow.core_expertise)   ? dbRow.core_expertise   : [],
        beyond_code_title:     dbRow.beyond_code_title     ?? '',
        beyond_code_paragraph: dbRow.beyond_code_paragraph ?? '',
        beyond_code_tags:      Array.isArray(dbRow.beyond_code_tags) ? dbRow.beyond_code_tags : [],
        education_label:       dbRow.education_label       ?? '',
        education_school:      dbRow.education_school      ?? '',
        education_subtitle:    dbRow.education_subtitle    ?? '',
        about_image_url:       dbRow.about_image_url       ?? '',
      })
      setDirty(false)
    }
  }, [dbRow])

  const set = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [field]: value }))
    setDirty(true)
  }, [])

  const setStr = useCallback((field: keyof FormState, value: string) => {
    set(field as any, value as any)
  }, [set])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setToast(null)

    const payload = { id: 1, ...form, updated_at: new Date().toISOString() }

    const { error } = await supabase
      .from('about_content')
      .upsert(payload, { onConflict: 'id' })

    setSaving(false)

    if (error) {
      setToast({ message: `Save failed: ${error.message}`, type: 'error' })
      return
    }

    await queryClient.invalidateQueries({ queryKey: ABOUT_KEY })
    setDirty(false)

    // Trigger ISR revalidation — non-blocking, warn only on failure
    const revalidated = await revalidateHomepage()
    setToast({
      message: revalidated
        ? 'About content saved. Public site updated.'
        : 'About content saved. Public site will refresh within 5 minutes.',
      type: 'success',
    })
  }

  const handleReset = () => {
    if (!dbRow) return
    setForm({
      section_subtitle:      dbRow.section_subtitle      ?? '',
      intro_before_emphasis: dbRow.intro_before_emphasis ?? '',
      intro_emphasis:        dbRow.intro_emphasis        ?? '',
      intro_after_emphasis:  dbRow.intro_after_emphasis  ?? '',
      highlight_quote:       dbRow.highlight_quote       ?? '',
      current_paragraph:     dbRow.current_paragraph     ?? '',
      core_expertise:        Array.isArray(dbRow.core_expertise)   ? dbRow.core_expertise   : [],
      beyond_code_title:     dbRow.beyond_code_title     ?? '',
      beyond_code_paragraph: dbRow.beyond_code_paragraph ?? '',
      beyond_code_tags:      Array.isArray(dbRow.beyond_code_tags) ? dbRow.beyond_code_tags : [],
      education_label:       dbRow.education_label       ?? '',
      education_school:      dbRow.education_school      ?? '',
      education_subtitle:    dbRow.education_subtitle    ?? '',
      about_image_url:       dbRow.about_image_url       ?? '',
    })
    setDirty(false)
    setImgUpload({ status: 'idle' })
  }

  // ── About photo upload ────────────────────────────────────────────────────
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

    const newPath = aboutPhotoPath(file)

    // Remove all other known variants so only one file exists in the bucket
    const toRemove = ABOUT_IMG_VARIANTS.filter(v => v !== newPath)
    await supabase.storage.from('about-images').remove(toRemove)

    const { error: uploadError } = await supabase.storage
      .from('about-images')
      .upload(newPath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setImgUpload({ status: 'error', message: uploadError.message })
      return
    }

    const { data } = supabase.storage.from('about-images').getPublicUrl(newPath)
    setStr('about_image_url', `${data.publicUrl}?v=${Date.now()}`)
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

  // ── Fetch error ───────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-[#1a0f0f] p-6">
        <p className="text-sm text-red-400">
          Failed to load about content: {(fetchError as Error).message}
        </p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      <div className="space-y-7 w-full">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-1">
              About Section
            </p>
            <h2 className="text-xl font-semibold text-white/90">About Editor</h2>
            <p className="text-sm text-white/30 mt-1">
              Edit the public about section. Saves directly to the database.
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

            {/* ── Story card ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-5">
                Story
              </p>

              <div className="space-y-5">

                {/* Section subtitle */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Section Subtitle <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.section_subtitle}
                    onChange={e => setStr('section_subtitle', e.target.value)}
                    placeholder="A quick story about where I started…"
                    required
                    className={inputCls}
                  />
                  <p className="text-[11px] text-white/20 mt-1.5">
                    Shown below the "About" section heading.
                  </p>
                </div>

                {/* Intro paragraph — split three fields */}
                <div className="space-y-3">
                  <label className="block text-xs text-white/45">
                    Intro Paragraph <span className="text-red-400/60">*</span>
                  </label>
                  <div>
                    <p className="text-[11px] text-white/25 mb-1.5">Before emphasis</p>
                    <input
                      type="text"
                      value={form.intro_before_emphasis}
                      onChange={e => setStr('intro_before_emphasis', e.target.value)}
                      placeholder="I come from a non-traditional background"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/25 mb-1.5">
                      Emphasis <span className="text-white/40">(rendered white + medium weight)</span>
                    </p>
                    <input
                      type="text"
                      value={form.intro_emphasis}
                      onChange={e => setStr('intro_emphasis', e.target.value)}
                      placeholder="—my academic path was in History—"
                      required
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/25 mb-1.5">After emphasis</p>
                    <textarea
                      value={form.intro_after_emphasis}
                      onChange={e => setStr('intro_after_emphasis', e.target.value)}
                      placeholder="but I was always drawn to logic…"
                      required
                      rows={4}
                      className={textareaCls}
                    />
                  </div>
                </div>

                {/* Highlight quote */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Highlight Quote <span className="text-red-400/60">*</span>
                  </label>
                  <textarea
                    value={form.highlight_quote}
                    onChange={e => setStr('highlight_quote', e.target.value)}
                    placeholder="From history to frontend — I build clean, structured UI…"
                    required
                    rows={2}
                    className={textareaCls}
                  />
                  <p className="text-[11px] text-white/20 mt-1.5">
                    Rendered as an italic blockquote with a left border.
                  </p>
                </div>

                {/* Current paragraph */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Current Work Paragraph <span className="text-red-400/60">*</span>
                  </label>
                  <textarea
                    value={form.current_paragraph}
                    onChange={e => setStr('current_paragraph', e.target.value)}
                    placeholder="Today, I work with the MERN stack…"
                    required
                    rows={5}
                    className={textareaCls}
                  />
                </div>
              </div>
            </div>

            {/* ── Expertise & Beyond Code card ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-5">
                Expertise &amp; Beyond Code
              </p>

              <div className="space-y-5">

                {/* Core expertise */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Core Expertise <span className="text-red-400/60">*</span>
                  </label>
                  <textarea
                    value={form.core_expertise.join('\n')}
                    onChange={e =>
                      set('core_expertise', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))
                    }
                    placeholder={'Responsive Layouts (mobile-first)\nReact + Component-Based UI\nAPI Integration + Auth'}
                    rows={6}
                    className={textareaCls}
                  />
                  <p className="text-[11px] text-white/20 mt-1.5">
                    One item per line. Each line becomes a bullet point.
                  </p>
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Beyond code title */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Beyond Code Title <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.beyond_code_title}
                    onChange={e => setStr('beyond_code_title', e.target.value)}
                    placeholder="Beyond Code"
                    required
                    className={inputCls}
                  />
                </div>

                {/* Beyond code paragraph */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Beyond Code Paragraph <span className="text-red-400/60">*</span>
                  </label>
                  <textarea
                    value={form.beyond_code_paragraph}
                    onChange={e => setStr('beyond_code_paragraph', e.target.value)}
                    placeholder="When I'm not coding, I'm usually at the gym…"
                    required
                    rows={4}
                    className={textareaCls}
                  />
                </div>

                {/* Beyond code tags */}
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Tags <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.beyond_code_tags.join(', ')}
                    onChange={e =>
                      set('beyond_code_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))
                    }
                    placeholder="Discipline, Resilience"
                    required
                    className={inputCls}
                  />
                  <p className="text-[11px] text-white/20 mt-1.5">
                    Comma-separated. Each tag gets a checkmark badge.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Academic card ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-5">
                Academic Background
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Card Label <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.education_label}
                    onChange={e => setStr('education_label', e.target.value)}
                    placeholder="Academic Background"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    School / Institution <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.education_school}
                    onChange={e => setStr('education_school', e.target.value)}
                    placeholder="Govt. Titumir College"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/45 mb-2">
                    Subtitle <span className="text-red-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.education_subtitle}
                    onChange={e => setStr('education_subtitle', e.target.value)}
                    placeholder="History Major turned Developer"
                    required
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ── Photo card ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] p-7">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-5">
                About Photo
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  {/* Thumbnail preview */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/[0.10] bg-white/[0.04] flex-shrink-0">
                    {form.about_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.about_image_url}
                        alt="About photo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-white/20 text-[22px]">person</span>
                        <span className="text-[9px] text-white/20 text-center leading-tight px-1">
                          Local<br />fallback
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed">
                      {form.about_image_url
                        ? 'Current photo from database.'
                        : 'No photo uploaded — public site uses the local fallback image.'}
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
                          <span className="material-symbols-outlined text-[14px]">add_photo_alternate</span>
                          {form.about_image_url ? 'Replace Photo' : 'Upload Photo'}
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

          {/* ══ RIGHT: Preview + notice ══ */}
          <div className="space-y-5 lg:sticky lg:top-24">

            {/* Preview card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#141414] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/30">
                  Live Preview
                </p>
                <span className="flex items-center gap-1.5 text-[10px] text-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                  About section
                </span>
              </div>

              <div className="relative p-6 bg-gradient-to-br from-white/[0.02] to-transparent space-y-4">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4AF37]/[0.03] blur-[60px] rounded-full pointer-events-none" />

                {/* Quote preview */}
                <div className="relative">
                  <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">Highlight quote</p>
                  <p className="text-xs text-white/70 italic border-l-2 border-[#D4AF37]/40 pl-3 leading-relaxed">
                    {form.highlight_quote || <span className="text-white/20">Quote…</span>}
                  </p>
                </div>

                {/* Expertise preview */}
                <div className="relative">
                  <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">Core Expertise</p>
                  {form.core_expertise.length > 0 ? (
                    <ul className="space-y-1.5">
                      {form.core_expertise.slice(0, 5).map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-white/50">
                          <span className="w-1 h-1 rounded-full bg-[#D4AF37]/60 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                      {form.core_expertise.length > 5 && (
                        <li className="text-[11px] text-white/25 pl-3">
                          +{form.core_expertise.length - 5} more
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/20 italic">No items yet…</p>
                  )}
                </div>

                {/* Tags preview */}
                <div className="relative">
                  <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {form.beyond_code_tags.length > 0 ? (
                      form.beyond_code_tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-white/[0.10] text-white/40"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-white/20 italic">No tags yet…</span>
                    )}
                  </div>
                </div>

                {/* Academic preview */}
                <div className="relative border-t border-white/[0.06] pt-4">
                  <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">Academic card</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">
                    {form.education_label || '—'}
                  </p>
                  <p className="text-sm font-semibold text-white/80 mt-0.5">
                    {form.education_school || <span className="text-white/20 font-normal italic">School…</span>}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {form.education_subtitle || <span className="text-white/20 italic">Subtitle…</span>}
                  </p>
                </div>

                {/* Photo preview */}
                <div className="relative border-t border-white/[0.06] pt-4">
                  <p className="text-[11px] text-white/25 uppercase tracking-widest mb-2">About photo</p>
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                    {form.about_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.about_image_url}
                        alt="About photo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-white/15 text-[28px]">image</span>
                        <span className="text-[10px] text-white/20">Local fallback</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

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
                  <p className="text-xs font-semibold text-[#D4AF37]/80">Live updates</p>
                  <p className="text-[11px] text-[#D4AF37]/50 leading-relaxed">
                    Saving triggers instant revalidation of the public site. Changes appear immediately after the next page load.
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
