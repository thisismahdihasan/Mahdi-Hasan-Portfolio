'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '@/components/PageWrapper'
import Navbar from '@/components/Navbar'
import ProfileImage from '@/components/ProfileImage'
import MouseSpotlight from '@/components/MouseSpotlight'
import Hero from '@/components/Hero'
import SkillsSection from '@/components/SkillsSection'
import ProjectsSection from '@/components/ProjectsSection'
import AboutSection from '@/components/about/AboutSection'
import ContactSection from '@/components/contact/ContactSection'
import Footer from '@/components/Footer'
import EntryLoader from '@/components/EntryLoader'
import RefreshLoader from '@/components/RefreshLoader'
import FallBeamBackground from '@/components/FallBeamBackground'
import { useEntryLoader } from '@/hooks/useEntryLoader'
import type { Project } from '@/types/project'
import type { SerializableSkillCategory } from '@/app/page'
import type { HeroContent } from '@/types/hero'
import type { AboutContent } from '@/types/about'

interface Props {
  initialProjects?: Project[]
  projectsFromSupabase?: boolean
  initialSkillCategories?: SerializableSkillCategory[]
  skillsFromSupabase?: boolean
  initialHeroContent?: HeroContent
  initialAboutContent?: AboutContent
}

export default function PortfolioClient({ initialProjects, projectsFromSupabase = true, initialSkillCategories, skillsFromSupabase = true, initialHeroContent, initialAboutContent }: Props) {
  const {
    showEntryLoader,
    showRefreshLoader,
    entryLoaderComplete,
    handleEntryComplete,
    handleRefreshComplete,
    skipSmartLoader,
  } = useEntryLoader()
  const [entryRevealReady, setEntryRevealReady] = useState(false)
  const [revealKey, setRevealKey] = useState(0)

  useEffect(() => {
    const welcomeShown = sessionStorage.getItem('welcomeShown')
    if (welcomeShown && !showRefreshLoader) {
      setEntryRevealReady(true)
    }
  }, [showRefreshLoader])

  const handleLoaderComplete = () => {
    handleEntryComplete()
    setEntryRevealReady(true)
    setRevealKey(prev => prev + 1)
  }

  const handleRefreshLoaderComplete = () => {
    handleRefreshComplete()
    setEntryRevealReady(true)
    setRevealKey(prev => prev + 1)
  }

  return (
    <>
      {/* Entry Welcome Loader - First Visit Only */}
      <AnimatePresence mode="wait">
        {showEntryLoader && (
          <EntryLoader onComplete={handleLoaderComplete} />
        )}
      </AnimatePresence>

      {/* Refresh Loader - Page Refresh Only */}
      <AnimatePresence mode="wait">
        {showRefreshLoader && (
          <RefreshLoader onComplete={handleRefreshLoaderComplete} />
        )}
      </AnimatePresence>

      <PageWrapper entryLoaderComplete={entryLoaderComplete} skipSmartLoader={skipSmartLoader}>
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {/* Fall Beam Background — public portfolio only, not rendered on /dashboard */}
          <FallBeamBackground
            beamColorClass="golden"
            className="z-1"
          />
          <main id="main-content" className="text-neutral-800 dark:text-neutral-200 min-h-screen relative" style={{ touchAction: 'pan-y' }}>
            <MouseSpotlight />

            <Navbar key={`navbar-${revealKey}`} entryRevealReady={entryRevealReady} />

            {/* Hero Section */}
            <section id="hero" className="scroll-mt-24 flex flex-col md:flex-row md:gap-10 md:items-center lg:flex-row lg:gap-0 lg:items-stretch lg:min-h-screen relative z-10 pt-[28px] md:pt-16 mb-12 sm:mb-16 md:mb-28">
              <div className="w-full md:w-[55%] lg:w-[55%] bg-black/20 lg:border-r lg:border-neutral-200/20 dark:lg:border-neutral-800/80 p-6 sm:p-8 md:p-12 relative z-20">
                <Hero key={`hero-${revealKey}`} entryRevealReady={entryRevealReady} heroContent={initialHeroContent} />
              </div>
              <div className="w-full md:w-[45%] lg:w-[45%] relative z-[100] profile-image-container lg:min-h-screen">
                <ProfileImage key={`image-${revealKey}`} entryRevealReady={entryRevealReady} profileImageUrl={initialHeroContent?.profile_image_url} />
              </div>
            </section>

            <SkillsSection initialSkillCategories={initialSkillCategories} skillsFromSupabase={skillsFromSupabase} />
            <ProjectsSection initialProjects={initialProjects} projectsFromSupabase={projectsFromSupabase} />
            <AboutSection aboutContent={initialAboutContent} />
            <ContactSection />
            <Footer />
          </main>
        </motion.div>
      </PageWrapper>
    </>
  )
}
