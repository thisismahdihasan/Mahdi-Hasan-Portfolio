export type { Project } from '@/types/project'
import type { Project } from '@/types/project'

export const projects: Project[] = [
  {
    id: 1,
    title: 'Voyago',
    description: 'A modern vehicle booking platform that makes renting and managing cars simple—users can explore, book, and track rides, while hosts control listings and availability through a clean dashboard.',
    summary: 'Vehicle booking platform',
    tech: ['React', 'Tailwind CSS', 'Node.js', 'Express', 'MongoDB', 'Firebase'],
    image: '/voyago.webp',
    liveUrl: 'https://voyago-2805d.web.app',
    sourceUrl: 'https://github.com/mahdi9162/Voyago-Client-Side.git',
    category: 'frontend',
    status: 'published'
  },
  {
    id: 2,
    title: 'EduBridge',
    description: 'A trust-focused tuition management system designed to keep tutors and students aligned—handling learning flow, tracking progress, and daily class coordination without unnecessary complexity.',
    summary: 'Tuition management system',
    tech: ['React', 'Tailwind CSS', 'Firebase', 'Node.js', 'MongoDB'],
    image: '/edubridge.webp',
    liveUrl: 'https://edubridge-production.web.app',
    sourceUrl: 'https://github.com/mahdi9162/EduBridge-Client-Side.git',
    category: 'frontend',
    status: 'published'
  },
  {
    id: 3,
    title: 'AppVerse',
    description: 'A sleek productivity app explorer where users can discover tools, view detailed insights, and manage installs instantly—built for smooth interaction, clarity, and speed.',
    summary: 'Productivity app explorer',
    tech: ['React', 'Tailwind', 'JavaScript'],
    image: '/appverse.webp',
    liveUrl: 'https://appversee.netlify.app',
    sourceUrl: 'https://github.com/mahdi9162/AppVerse.git',
    category: 'frontend',
    status: 'published'
  },
  {
    id: 4,
    title: 'Skillora',
    description: 'A local 1-on-1 skill-sharing platform that connects learners with nearby mentors—making it easy to discover skills, schedule sessions, and learn in a more personal, real-world way.',
    summary: 'Skill-sharing platform',
    tech: ['React', 'Tailwind CSS', 'Firebase', 'MongoDB', 'Express'],
    image: '/skillora.webp',
    liveUrl: 'https://skillora-505c9.web.app',
    sourceUrl: 'https://github.com/mahdi9162/Skillora.git',
    category: 'frontend',
    status: 'published'
  },
  {
    id: 5,
    title: 'SwashPeak — Storefront UI Refresh (Client)',
    description: 'Frontend improvements shipped to a live storefront—navigation, responsive layout, and UI polish.',
    summary: 'E-commerce storefront redesign',
    tech: ['HTML', 'CSS', 'Responsive Layout', 'Theme Sections (Shopify)'],
    image: '/SwashPeak.webp',
    liveUrl: 'https://swashpeak.com/',
    category: 'client',
    bullets: [
      'Improved navigation + category structure so users can find products faster',
      'Made the storefront fully responsive across mobile/tablet/desktop',
      'Added modern sections + UI polish for a cleaner brand presentation'
    ],
    status: 'published'
  }
]
