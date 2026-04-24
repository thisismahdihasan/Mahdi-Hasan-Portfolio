import {
  SiReact,
  SiJavascript,
  SiTailwindcss,
  SiNodedotjs,
  SiExpress,
  SiMongodb,
  SiGit,
  SiFirebase,
  SiNetlify
} from 'react-icons/si'
import { FaCode, FaServer, FaDatabase, FaTools } from 'react-icons/fa'

export type { OrbitalIcon, SkillCategory } from '@/types/skill'
import type { OrbitalIcon, SkillCategory } from '@/types/skill'

export const orbitalIcons: OrbitalIcon[] = [
  { id: 'react',      name: 'React',       icon: SiReact,      description: 'Component-based UI library for building dynamic interfaces',    category: 'Frontend' },
  { id: 'javascript', name: 'JavaScript',  icon: SiJavascript, description: 'Modern ES6+ JavaScript for interactive web applications',        category: 'Frontend' },
  { id: 'tailwind',   name: 'Tailwind CSS',icon: SiTailwindcss,description: 'Utility-first CSS framework for rapid UI development',           category: 'Frontend' },
  { id: 'nodejs',     name: 'Node.js',     icon: SiNodedotjs,  description: 'JavaScript runtime for building scalable server applications',   category: 'Backend'  },
  { id: 'mongodb',    name: 'MongoDB',     icon: SiMongodb,    description: 'NoSQL database for flexible, document-based data storage',       category: 'Database' },
  { id: 'express',    name: 'Express.js',  icon: SiExpress,    description: 'Minimal web framework for Node.js backend services',             category: 'Backend'  },
  { id: 'git',        name: 'Git',         icon: SiGit,        description: 'Version control system for tracking code changes',               category: 'Tools'    },
  { id: 'firebase',   name: 'Firebase',    icon: SiFirebase,   description: 'Backend-as-a-service platform for rapid development',            category: 'Database' },
  { id: 'netlify',    name: 'Netlify',     icon: SiNetlify,    description: 'Modern hosting platform for web applications',                   category: 'Tools'    }
]

export const skillCategories: SkillCategory[] = [
  {
    title: 'Frontend',
    icon: FaCode,
    skills: ['React', 'Next.js', 'JavaScript', 'Tailwind CSS', 'HTML5', 'CSS3'],
    relatedOrbIcons: ['react', 'javascript', 'tailwind']
  },
  {
    title: 'Backend',
    icon: FaServer,
    skills: ['Node.js', 'Express.js', 'REST APIs'],
    relatedOrbIcons: ['nodejs', 'express']
  },
  {
    title: 'Database & Auth',
    icon: FaDatabase,
    skills: ['MongoDB', 'Firebase', 'JWT'],
    relatedOrbIcons: ['mongodb', 'firebase']
  },
  {
    title: 'Tools & Workflow',
    icon: FaTools,
    skills: ['Git', 'GitHub', 'VS Code', 'Postman', 'Netlify', 'Vercel'],
    relatedOrbIcons: ['git', 'netlify']
  }
]
