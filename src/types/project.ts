export interface Project {
  id: string | number
  title: string
  description: string
  summary: string
  tech: string[]
  image: string
  liveUrl: string
  sourceUrl?: string
  category: 'frontend' | 'client'
  bullets?: string[]
  status: 'published' | 'draft'
}
