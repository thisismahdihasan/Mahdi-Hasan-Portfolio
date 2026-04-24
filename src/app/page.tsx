import PortfolioClient from '@/components/PortfolioClient'
import type { Project } from '@/types/project'
import type { HeroContent } from '@/types/hero'
import type { AboutContent } from '@/types/about'

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

// ── About content defaults (mirrors DB seed row) ─────────────────────────────
const ABOUT_FALLBACK: AboutContent = {
  id: 1,
  section_subtitle: 'A quick story about where I started and what I build now.',
  intro_before_emphasis: 'I come from a non-traditional background',
  intro_emphasis: '—my academic path was in History—',
  intro_after_emphasis:
    "but I was always drawn to logic, structure, and building things. The turning point came when I realized I was preparing for a future I didn't want. I chose to pivot, got the support I needed, and began my development journey through Programming Hero—then kept growing through real projects and consistent practice.",
  highlight_quote:
    'From history to frontend — I build clean, structured UI that feels product-ready.',
  current_paragraph:
    "Today, I work with the MERN stack with a frontend-first mindset: crafting responsive layouts, building reusable React components, and integrating real features like authentication and APIs. I care about clarity—both in code and in the user experience. I'm also building with Next.js and improving my workflow for scalable, production-ready apps.",
  core_expertise: [
    'Responsive Layouts (mobile-first)',
    'React + Component-Based UI',
    'API Integration + Auth',
    'Tailwind CSS + Modern UI',
    'MERN Foundations (Node/Express/MongoDB)',
    'Deployment (Vercel/Netlify/Firebase)',
  ],
  beyond_code_title: 'Beyond Code',
  beyond_code_paragraph:
    "When I'm not coding, I'm usually at the gym. Training keeps me consistent and focused—and that same discipline shows up in how I work: I stay calm under pressure, iterate through feedback, and keep improving until the details feel right.",
  beyond_code_tags: ['Discipline', 'Resilience'],
  education_label: 'Academic Background',
  education_school: 'Govt. Titumir College',
  education_subtitle: 'History Major turned Developer',
}

async function getAboutContent(): Promise<AboutContent> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return ABOUT_FALLBACK

    const res = await fetch(
      `${url}/rest/v1/about_content?id=eq.1&select=*&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
      }
    )

    if (!res.ok) return ABOUT_FALLBACK
    const data: any[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) return ABOUT_FALLBACK

    const row = data[0]
    return {
      id: row.id ?? 1,
      section_subtitle:      row.section_subtitle      || ABOUT_FALLBACK.section_subtitle,
      intro_before_emphasis: row.intro_before_emphasis || ABOUT_FALLBACK.intro_before_emphasis,
      intro_emphasis:        row.intro_emphasis        || ABOUT_FALLBACK.intro_emphasis,
      intro_after_emphasis:  row.intro_after_emphasis  || ABOUT_FALLBACK.intro_after_emphasis,
      highlight_quote:       row.highlight_quote       || ABOUT_FALLBACK.highlight_quote,
      current_paragraph:     row.current_paragraph     || ABOUT_FALLBACK.current_paragraph,
      core_expertise:        Array.isArray(row.core_expertise)   ? row.core_expertise   : ABOUT_FALLBACK.core_expertise,
      beyond_code_title:     row.beyond_code_title     || ABOUT_FALLBACK.beyond_code_title,
      beyond_code_paragraph: row.beyond_code_paragraph || ABOUT_FALLBACK.beyond_code_paragraph,
      beyond_code_tags:      Array.isArray(row.beyond_code_tags) ? row.beyond_code_tags : ABOUT_FALLBACK.beyond_code_tags,
      education_label:       row.education_label       || ABOUT_FALLBACK.education_label,
      education_school:      row.education_school      || ABOUT_FALLBACK.education_school,
      education_subtitle:    row.education_subtitle    || ABOUT_FALLBACK.education_subtitle,
      about_image_url:       row.about_image_url       || undefined,
      updated_at:            row.updated_at,
    }
  } catch {
    return ABOUT_FALLBACK
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
  const [initialHeroContent, initialAboutContent, initialProjects, initialSkillCategories] = await Promise.all([
    getHeroContent(),
    getAboutContent(),
    getInitialProjects(),
    getInitialSkillCategories(),
  ])

  return (
    <PortfolioClient
      initialHeroContent={initialHeroContent}
      initialAboutContent={initialAboutContent}
      initialProjects={initialProjects}
      initialSkillCategories={initialSkillCategories}
    />
  )
}
