import PortfolioClient from '@/components/PortfolioClient'
import type { Project } from '@/types/project'
import type { HeroContent } from '@/types/hero'

// Serializable skill data (no React components)
export interface SerializableSkillCategory {
  title: string
  skills: string[]
}

// ── Server-side cached Supabase fetch ────────────────────────────────────────
// Runs at build time and revalidates every 5 minutes.
// If it fails, undefined is passed and the client falls back to static data.

// ── Hero content defaults (mirrors DB seed row) ──────────────────────────────
const HERO_FALLBACK: HeroContent = {
  id: 1,
  name: 'MAHDI HASAN',
  role: 'Junior Frontend Developer',
  description:
    'Building responsive web applications with React, Next.js, and Tailwind CSS. Experienced in full-stack development using the MERN stack with a focus on clean code and user-centric design.',
  primary_cta_label: 'Download Resume',
  primary_cta_url: "/Mahdi_Hasan's_Resume.pdf",
  secondary_cta_label: 'View Projects',
}

async function getHeroContent(): Promise<HeroContent> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return HERO_FALLBACK

    const res = await fetch(
      `${url}/rest/v1/hero_content?id=eq.1&select=*&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
      }
    )

    if (!res.ok) return HERO_FALLBACK
    const data: any[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) return HERO_FALLBACK

    const row = data[0]
    return {
      id: row.id ?? 1,
      name: row.name || HERO_FALLBACK.name,
      role: row.role || HERO_FALLBACK.role,
      description: row.description || HERO_FALLBACK.description,
      primary_cta_label: row.primary_cta_label || HERO_FALLBACK.primary_cta_label,
      primary_cta_url: row.primary_cta_url || HERO_FALLBACK.primary_cta_url,
      secondary_cta_label: row.secondary_cta_label || HERO_FALLBACK.secondary_cta_label,
      profile_image_url: row.profile_image_url || undefined,
      updated_at: row.updated_at,
    }
  } catch {
    return HERO_FALLBACK
  }
}

async function getInitialProjects(): Promise<Project[] | undefined> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return undefined

    const res = await fetch(
      `${url}/rest/v1/projects?status=eq.published&order=sort_order.asc,created_at.desc&select=*`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
      }
    )

    if (!res.ok) return undefined
    const data: any[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) return undefined

    const mapped: Project[] = data
      .map((row) => {
        if (!row.id || !row.title || !row.category) return null
        const image = row.image_url ?? ''
        if (!image) return null
        return {
          id: row.id,
          title: row.title,
          description: row.full_description ?? row.short_description ?? '',
          summary: row.short_description ?? '',
          tech: Array.isArray(row.tech_stack) ? row.tech_stack : [],
          image,
          liveUrl: row.live_url ?? '',
          sourceUrl: row.github_url ?? undefined,
          category: row.category as 'frontend' | 'client',
          bullets: Array.isArray(row.bullets) ? row.bullets : undefined,
          status: (row.status ?? 'published') as 'published' | 'draft',
        }
      })
      .filter(Boolean) as Project[]

    return mapped.length > 0 ? mapped : undefined
  } catch {
    return undefined
  }
}

async function getInitialSkillCategories(): Promise<SerializableSkillCategory[] | undefined> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return undefined

    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    }

    const [catRes, skillRes] = await Promise.all([
      fetch(
        `${url}/rest/v1/skill_categories?order=sort_order.asc,created_at.asc&select=id,title`,
        { headers, next: { revalidate: 300 } }
      ),
      fetch(
        `${url}/rest/v1/skills?order=sort_order.asc,created_at.asc&select=name,category_id`,
        { headers, next: { revalidate: 300 } }
      ),
    ])

    if (!catRes.ok || !skillRes.ok) return undefined

    const catData: { id: string; title: string }[] = await catRes.json()
    const skillData: { name: string; category_id: string }[] = await skillRes.json()

    if (!Array.isArray(catData) || catData.length === 0) return undefined

    const mapped: SerializableSkillCategory[] = catData.map((cat) => ({
      title: cat.title,
      skills: skillData
        .filter((s) => s.category_id === cat.id)
        .map((s) => s.name),
    }))

    return mapped.length > 0 ? mapped : undefined
  } catch {
    return undefined
  }
}

// ── Server component page ────────────────────────────────────────────────────
export default async function Home() {
  // Fetch in parallel — failures return undefined, client handles fallback
  const [initialHeroContent, initialProjects, initialSkillCategories] = await Promise.all([
    getHeroContent(),
    getInitialProjects(),
    getInitialSkillCategories(),
  ])

  return (
    <PortfolioClient
      initialHeroContent={initialHeroContent}
      initialProjects={initialProjects}
      initialSkillCategories={initialSkillCategories}
    />
  )
}
