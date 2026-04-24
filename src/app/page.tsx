import PortfolioClient from '@/components/PortfolioClient'
import type { Project } from '@/types/project'

// Serializable skill data (no React components)
export interface SerializableSkillCategory {
  title: string
  skills: string[]
}

// ── Server-side cached Supabase fetch ────────────────────────────────────────
// Runs at build time and revalidates every 5 minutes.
// If it fails, undefined is passed and the client falls back to static data.

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
  const [initialProjects, initialSkillCategories] = await Promise.all([
    getInitialProjects(),
    getInitialSkillCategories(),
  ])

  return (
    <PortfolioClient
      initialProjects={initialProjects}
      initialSkillCategories={initialSkillCategories}
    />
  )
}
