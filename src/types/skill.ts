export interface OrbitalIcon {
  id: string
  name: string
  icon: any
  description: string
  category: string
}

export interface SkillCategory {
  title: string
  icon: any
  skills: string[]
  relatedOrbIcons: string[]
}
