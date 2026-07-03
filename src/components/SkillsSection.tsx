'use client'

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { EASE_OUT, EASE_OUT_QUART } from '@/lib/animations'
import { useMediaPreferences } from '@/hooks/useMediaQueries'
import { orbitalIcons, skillCategories as fallbackCategories } from '@/data/skills'
import type { OrbitalIcon, SkillCategory } from '@/data/skills'
import { supabase } from '@/lib/supabase'

// Serializable shape that crosses the server→client boundary (no React components)
interface SerializableSkillCategory {
  title: string
  skills: string[]
}

// Merge server-provided serializable categories with static fallback to restore
// UI-only fields (icon, relatedOrbIcons) that cannot be serialized server-side.
function mergeWithFallback(serverCats: SerializableSkillCategory[]): SkillCategory[] {
  return serverCats.map((cat) => {
    const fallback = fallbackCategories.find((f) => f.title === cat.title)
    return {
      title: cat.title,
      skills: cat.skills.length > 0 ? cat.skills : (fallback?.skills ?? []),
      icon: fallback?.icon ?? fallbackCategories[0]?.icon,
      relatedOrbIcons: fallback?.relatedOrbIcons ?? [],
    }
  })
}

const SkillsSection = ({ initialSkillCategories }: { initialSkillCategories?: SerializableSkillCategory[] }) => {
  // Use shared media query hooks for better performance
  const { isMobile, prefersReducedMotion } = useMediaPreferences()

  // Seed from server-provided initial data (merged with static fallback for icons),
  // otherwise use static fallback directly.
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>(
    () => (initialSkillCategories && initialSkillCategories.length > 0)
      ? mergeWithFallback(initialSkillCategories)
      : fallbackCategories
  )

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const { data: catData, error: catError } = await supabase
          .from('skill_categories')
          .select('id, title')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        if (catError || !catData || catData.length === 0) {
          console.warn('[SkillsSection] Categories fetch failed — using fallback:', catError?.message)
          return
        }

        const { data: skillData, error: skillError } = await supabase
          .from('skills')
          .select('name, category_id')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        if (skillError || !skillData) {
          console.warn('[SkillsSection] Skills fetch failed — using fallback:', skillError?.message)
          return
        }

        // Build the same SkillCategory shape the UI already uses
        const mapped: SkillCategory[] = catData.map((cat) => {
          const catSkills = skillData
            .filter((s) => s.category_id === cat.id)
            .map((s) => s.name)

          // Preserve relatedOrbIcons from static fallback by matching on title
          const fallback = fallbackCategories.find((f) => f.title === cat.title)

          return {
            title: cat.title,
            icon: fallback?.icon ?? fallbackCategories[0].icon,
            skills: catSkills.length > 0 ? catSkills : (fallback?.skills ?? []),
            relatedOrbIcons: fallback?.relatedOrbIcons ?? [],
          }
        })

        if (mapped.length === 0) {
          console.warn('[SkillsSection] Mapped categories empty — using fallback')
          return
        }

        console.log('[SkillsSection] Loaded categories from DB:', mapped.length)
        setSkillCategories(mapped)
      } catch (err) {
        console.warn('[SkillsSection] Supabase fetch failed — using fallback:', err)
      }
    }

    fetchSkills()
  }, [])

  const [selectedIcon, setSelectedIcon] = useState<OrbitalIcon | null>(null)
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null)
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  // Use refs for touch tracking — avoids re-renders during swipe gesture
  const touchStartRef = useRef(0)
  const touchEndRef = useRef(0)

  // ✅ Memoize animation variants for section - mobile-optimized
  const sectionVariants: Variants = useMemo(() => ({
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0,
        duration: isMobile ? 0.4 : 0.6
      }
    }
  }), [isMobile])

  const titleVariants = useMemo(() => ({
    hidden: { opacity: 0, y: isMobile ? 20 : 14 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: isMobile ? 0.4 : 0.5,
        ease: EASE_OUT
      }
    }
  }), [isMobile])

  const orbitVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      scale: 0.96
    },
    show: { 
      opacity: 1, 
      scale: 1
    }
  }), [])

  const cardStackVariants = useMemo(() => ({
    hidden: { 
      opacity: 0, 
      x: 24
    },
    show: { 
      opacity: 1, 
      x: 0
    }
  }), [])

  // Map orb icon hover to related card
  const handleOrbIconHover = useCallback((iconId: string | null) => {
    if (!iconId) {
      setHighlightedCard(null)
      return
    }
    const relatedCard = skillCategories.find(cat =>
      cat.relatedOrbIcons.includes(iconId)
    )
    if (relatedCard) setHighlightedCard(relatedCard.title)
  }, [skillCategories])

  // Navigate to next card
  const nextCard = useCallback(() => {
    setActiveCardIndex((prev) => (prev + 1) % skillCategories.length)
  }, [skillCategories.length])

  // Navigate to previous card
  const prevCard = useCallback(() => {
    setActiveCardIndex((prev) => (prev - 1 + skillCategories.length) % skillCategories.length)
  }, [skillCategories.length])

  // Touch handlers — use refs so move events don't trigger re-renders
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX
    touchEndRef.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !touchEndRef.current) return
    const distance = touchStartRef.current - touchEndRef.current
    if (distance > 50) nextCard()
    else if (distance < -50) prevCard()
    touchStartRef.current = 0
    touchEndRef.current = 0
  }, [nextCard, prevCard])

  return (
    <motion.section 
      id="skills" 
      className="scroll-mt-24 section-gap w-full bg-black/20 overflow-x-hidden lg:overflow-visible my-12 sm:my-16 md:my-28 sm:py-18 md:py-0 skills-section content-visibility-auto"
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1, margin: "-50px 0px" }}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Section Container - Max width and centered */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 relative z-10">
        {/* Header - Simplified with kicker styling on main title */}
        <motion.div 
          className="mb-8 md:mb-14 lg:mb-16 text-left"
          variants={titleVariants}
          transition={{
            duration: 0.5,
            ease: EASE_OUT
          }}
        >
          {/* Title with kicker styling + thin line accent */}
          <div className="flex items-center gap-4 mb-3">
            <h2 
              className="text-2xl md:text-5xl font-bold text-white uppercase tracking-[0.08em] hover:text-brand-gold-alt transition-all duration-300 cursor-pointer hover:drop-shadow-[0_0_15px_rgb(var(--brand-gold-alt)_/_0.25)]" 
              data-lens="on"
            >
              Skills
            </h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-white/20 to-transparent max-w-[140px]" />
          </div>

          {/* Subtitle */}
          <p className="text-xs md:text-lg text-white/70 max-w-[620px] leading-relaxed" data-lens="on">
            Core technologies and tools I use to build modern web applications.
          </p>
        </motion.div>

        {/* Main 2-Column Layout: Orbit LEFT + Stacked Deck RIGHT - Center Aligned */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-10 lg:gap-[72px]">
          
          {/* Left Column: Orbit Stage with Proper Mobile Height */}
          <motion.div
            className="flex-shrink-0 w-full lg:w-auto"
            variants={orbitVariants}
            transition={{
              type: "tween",
              duration: 0.6,
              ease: EASE_OUT
            }}
            style={{
              willChange: "transform, opacity",
              transform: "translateZ(0)"
            }}
          >
            {/* Orbit Stage - Dedicated container with proper height for mobile */}
            <div className="min-h-[320px] sm:min-h-[360px] md:min-h-[380px] lg:min-h-[420px] flex items-center justify-center overflow-visible mx-auto lg:mx-0 lg:w-[420px] p-4 max-w-full" style={{ touchAction: 'pan-y' }}>
              <TechOrb 
                icons={orbitalIcons}
                onIconClick={setSelectedIcon}
                onIconHover={handleOrbIconHover}
                isMobile={isMobile}
              />
            </div>
          </motion.div>

          {/* Right Column: Stacked Card Deck with Navigation */}
          <motion.div
            className="flex-1 max-w-[580px] w-full mx-auto lg:mx-0 flex flex-col justify-center"
            variants={cardStackVariants}
            transition={{
              type: "tween",
              duration: 0.6,
              ease: EASE_OUT,
              when: "beforeChildren",
              delayChildren: 0,
              staggerChildren: 0.04
            }}
            style={{
              willChange: "transform, opacity",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              touchAction: 'pan-y'
            }}
          >
            {/* Selected Skill Detail Card */}
            <AnimatePresence mode="wait">
              {selectedIcon && (
                <motion.div
                  key={selectedIcon.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.04] md:backdrop-blur-sm rounded-2xl border border-brand-gold/30 shadow-[0_0_30px_rgb(var(--brand-gold)_/_0.15)]"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2.5 bg-brand-gold/10 rounded-xl">
                      <selectedIcon.icon className="w-7 h-7 text-brand-gold" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1.5" data-lens="on">
                        {selectedIcon.name}
                      </h3>
                      <p className="text-sm text-white/70 leading-relaxed" data-lens="on">
                        {selectedIcon.description}
                      </p>
                      <span className="inline-block mt-2.5 px-2.5 py-1 text-xs bg-brand-gold/20 text-brand-gold rounded-full">
                        {selectedIcon.category}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stacked Card Deck Container with Navigation */}
            <div className="relative">
              {/* Left Arrow Button */}
              <button
                onClick={prevCard}
                className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 z-40 w-10 h-10 rounded-full bg-white/[0.08] md:backdrop-blur-sm border border-white/20 opacity-60 hover:opacity-100 focus:opacity-100 hover:border-brand-gold/40 hover:bg-white/[0.12] transition-all duration-420 items-center justify-center group"
                aria-label="Previous card"
              >
                <svg className="w-5 h-5 text-white/70 group-hover:text-brand-gold transition-colors duration-420" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Right Arrow Button */}
              <button
                onClick={nextCard}
                className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 z-40 w-10 h-10 rounded-full bg-white/[0.08] md:backdrop-blur-sm border border-white/20 opacity-60 hover:opacity-100 focus:opacity-100 hover:border-brand-gold/40 hover:bg-white/[0.12] transition-all duration-420 items-center justify-center group"
                aria-label="Next card"
              >
                <svg className="w-5 h-5 text-white/70 group-hover:text-brand-gold transition-colors duration-420" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Stacked Cards Container */}
              <div 
                className="relative overflow-visible"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Stacked Cards */}
                <div className="relative h-[420px] sm:h-[440px] md:h-[500px] overflow-visible">
                  {skillCategories.map((category, index) => {
                    const offset = (index - activeCardIndex + skillCategories.length) % skillCategories.length
                    const isActive = offset === 0
                    const isPreview1 = offset === 1
                    const isPreview2 = offset === 2
                    const isVisible = offset <= 2

                    return (
                      <StackedSkillCard
                        key={category.title}
                        category={category}
                        isActive={isActive}
                        isPreview1={isPreview1}
                        isPreview2={isPreview2}
                        isVisible={isVisible}
                        isHighlighted={highlightedCard === category.title}
                        isMobile={isMobile}
                      />
                    )
                  })}
                </div>

                {/* Dots Indicator - Mobile + Tablet (hidden on desktop) */}
                <div className="flex justify-center gap-2 mt-4 sm:mt-5 md:mt-6 lg:hidden">
                  {skillCategories.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setActiveCardIndex(index)
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === activeCardIndex
                          ? 'bg-brand-gold w-6'
                          : 'bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`View ${category.title}`}
                      aria-pressed={index === activeCardIndex}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

// Tech Orb Component — memoized so parent state changes don't re-render it
const TechOrb = memo(function TechOrb({ 
  icons, 
  onIconClick,
  onIconHover,
  isMobile
}: { 
  icons: OrbitalIcon[]
  onIconClick: (icon: OrbitalIcon) => void
  onIconHover?: (iconId: string | null) => void
  isMobile: boolean
}) {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null)
  const { prefersReducedMotion } = useMediaPreferences()

  const handleIconHover = useCallback((iconId: string | null) => {
    setHoveredIcon(iconId)
    onIconHover?.(iconId)
  }, [onIconHover])

  // Compute orbit config once per breakpoint — stable function reference
  const computeOrbitConfig = useCallback(() => {
    if (typeof window === 'undefined') return { containerSize: 340, iconSize: 56, radius: 170 }
    const width = window.innerWidth
    if (width <= 320) {
      const containerSize = 280; const iconSize = 38; const safeInset = 10
      return { containerSize, iconSize, radius: (containerSize / 2) - (iconSize / 2) - safeInset }
    }
    if (width < 640) {
      const containerSize = 310; const iconSize = 40; const safeInset = 10
      return { containerSize, iconSize, radius: (containerSize / 2) - (iconSize / 2) - safeInset }
    }
    if (width < 768) {
      const containerSize = 320; const iconSize = 44; const safeInset = 10
      return { containerSize, iconSize, radius: (containerSize / 2) - (iconSize / 2) - safeInset }
    }
    return { containerSize: 340, iconSize: 56, radius: 170 }
  }, [])

  const [orbitConfig, setOrbitConfig] = useState(computeOrbitConfig)

  useEffect(() => {
    const handleResize = () => setOrbitConfig(computeOrbitConfig())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [computeOrbitConfig])

  // On mobile: slow down orbit rotation to reduce GPU load
  const orbitDuration = isMobile ? 40 : 24

  return (
    <div className="w-full flex justify-center overflow-visible p-2 max-w-full" style={{ touchAction: 'pan-y' }}>
      <div 
        className="relative mx-auto max-w-full"
        style={{
          '--radius': `${orbitConfig.radius}px`,
          '--iconSize': `${orbitConfig.iconSize}px`,
          width: `${orbitConfig.containerSize}px`,
          height: `${orbitConfig.containerSize}px`,
          maxWidth: '100%',
          touchAction: 'pan-y'
        } as React.CSSProperties}
      >
      {/* Crisp Dashed Ring */}
      <div 
        className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
        style={{
          width: `calc(var(--radius) * 2)`,
          height: `calc(var(--radius) * 2)`,
          transform: 'translate(-50%, -50%)',
          border: '1px dashed rgba(255, 255, 255, 0.18)',
          filter: 'none',
          backdropFilter: 'none',
          zIndex: 10
        }}
      />

      {/* Central Orb Core */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative w-32 h-32 md:w-40 md:h-40">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 md:blur-xl" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-white/[0.02] md:backdrop-blur-md border border-white/20 shadow-[0_0_60px_rgb(var(--brand-gold)_/_0.2),inset_0_0_30px_rgb(var(--brand-gold)_/_0.1)]">
            <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/10 md:blur-md" />
            <div className="absolute inset-0 rounded-full opacity-30 mix-blend-overlay" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`
              }}
            />
          </div>
        </div>
      </div>

      {/* Orbit Track - Keep rotating on all devices including mobile */}
      <motion.div
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{
          width: `calc(var(--radius) * 2)`,
          height: `calc(var(--radius) * 2)`,
          transformOrigin: 'center',
          zIndex: 15
        }}
        animate={!prefersReducedMotion ? {
          transform: [
            'translate(-50%, -50%) rotate(0deg)',
            'translate(-50%, -50%) rotate(360deg)'
          ]
        } : {
          transform: 'translate(-50%, -50%) rotate(0deg)'
        }}
        transition={{
          duration: orbitDuration,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {/* 9 Orbiting Icons - Evenly spaced at 40deg intervals */}
        {icons.map((iconData, index) => {
          const IconComponent = iconData.icon
          const isHovered = hoveredIcon === iconData.id
          const angleDeg = index * 40 // 0, 40, 80, 120, 160, 200, 240, 280, 320
          
          return (
            <div
              key={iconData.id}
              className="absolute left-1/2 top-1/2 pointer-events-auto"
              style={{
                '--angle': `${angleDeg}deg`,
                width: 'var(--iconSize)',
                height: 'var(--iconSize)',
                transform: 'translate(-50%, -50%) rotate(var(--angle)) translateX(var(--radius)) rotate(calc(-1 * var(--angle)))',
                willChange: 'transform'
              } as React.CSSProperties}
            >
              {/* Floating animation — desktop only; mobile skips to reduce GPU load */}
              <motion.div
                animate={!prefersReducedMotion && !isHovered && !isMobile ? {
                  y: [-4, 4, -4]
                } : {}}
                transition={{
                  duration: 3 + index * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.2
                }}
              >
                <motion.button
                  onClick={() => onIconClick(iconData)}
                  onMouseEnter={() => handleIconHover(iconData.id)}
                  onMouseLeave={() => handleIconHover(null)}
                  whileHover={!isMobile ? { scale: 1.2 } : {}} // Disable hover on mobile
                  whileTap={{ scale: 0.95 }}
                  aria-label={iconData.name}
                  className="relative group w-full h-full"
                  style={{
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Icon container - Perfect Circle */}
                  <div 
                    className={`relative w-full h-full grid place-items-center bg-gradient-to-br from-white/[0.1] to-white/[0.05] md:backdrop-blur-sm border transition-all duration-420 ${
                      isHovered 
                        ? 'border-brand-gold/60 shadow-[0_0_25px_rgb(var(--brand-gold)_/_0.3)]' 
                        : 'border-white/10 hover:border-brand-gold/40'
                    }`}
                    style={{
                      borderRadius: '9999px',
                      aspectRatio: '1 / 1',
                      overflow: 'hidden'
                    }}
                  >
                    <IconComponent 
                      className={`transition-colors duration-420 ${
                        isHovered ? 'text-brand-gold' : 'text-white/80'
                      }`}
                      style={{
                        width: '60%',
                        height: '60%',
                        objectFit: 'contain'
                      }}
                    />
                    
                    {/* Hover ring pulse */}
                    {isHovered && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute inset-0 border-2 border-brand-gold/40"
                        style={{
                          borderRadius: '9999px'
                        }}
                      />
                    )}
                  </div>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/90 md:backdrop-blur-sm border border-brand-gold/30 rounded-lg whitespace-nowrap pointer-events-none z-50"
                    >
                      <span className="text-xs text-white font-medium">{iconData.name}</span>
                    </motion.div>
                  )}
                </motion.button>
              </motion.div>
            </div>
          )
        })}
      </motion.div>
    </div>
    </div>
  )
})

// Skill list animation variants — defined outside component so they're never recreated
const skillListContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0 }
  },
}
const skillListItem = {
  hidden: { opacity: 0, x: 10 },
  show:   { opacity: 1, x: 0 },
}

// Stacked Skill Card Component — memoized to prevent re-renders from parent state
const StackedSkillCard = memo(function StackedSkillCard({ 
  category, 
  isActive,
  isPreview1,
  isPreview2,
  isVisible,
  isHighlighted,
  isMobile
}: { 
  category: { title: string; icon: any; skills: string[]; relatedOrbIcons: string[] }
  isActive: boolean
  isPreview1: boolean
  isPreview2: boolean
  isVisible: boolean
  isHighlighted?: boolean
  isMobile: boolean
}) {
  const IconComponent = category.icon
  const { prefersReducedMotion } = useMediaPreferences()

  // Memoize derived values so they don't recalculate on every render
  const transform = useMemo(() => {
    if (!isVisible) return 'translateX(100%) scale(0.9) rotate(0deg)'
    if (isActive)   return 'translateX(0) translateY(0) scale(1) rotate(0deg)'
    if (isPreview1) return 'translateX(26px) translateY(18px) scale(0.96) rotate(3deg)'
    if (isPreview2) return 'translateX(48px) translateY(34px) scale(0.92) rotate(5deg)'
    return 'translateX(100%) scale(0.9) rotate(0deg)'
  }, [isVisible, isActive, isPreview1, isPreview2])

  const opacity = useMemo(() => {
    if (!isVisible) return 0
    if (isActive)   return 1
    if (isPreview1) return 0.55
    if (isPreview2) return 0.35
    return 0
  }, [isVisible, isActive, isPreview1, isPreview2])

  const zIndex = isActive ? 30 : isPreview1 ? 20 : isPreview2 ? 10 : 0

  // Only apply expensive backdrop-filter on the active (visible) card
  const cardStyle = useMemo(() => ({
    background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.92) 0%, rgba(12, 12, 12, 0.96) 100%)',
    backdropFilter: isActive ? 'blur(10px)' : 'none',
    WebkitBackdropFilter: isActive ? 'blur(10px)' : 'none',
    boxShadow: !isActive ? 'inset 0 1px 0 rgba(255, 255, 255, 0.06)' : undefined,
  }), [isActive])

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        zIndex: zIndex,
        pointerEvents: isActive ? 'auto' : 'none'
      }}
      initial={false}
      animate={{
        transform: transform,
        opacity: opacity,
      }}
      transition={{
        duration: prefersReducedMotion ? 0 : isMobile ? 0.3 : 0.55,
        ease: EASE_OUT_QUART
      }}
    >
      <div 
        className={`relative h-full overflow-hidden rounded-[18px] border transition-all duration-[550ms] ${
          isHighlighted
            ? 'border-brand-gold/50 shadow-[0_0_28px_rgb(var(--brand-gold)_/_0.22),0_8px_24px_rgba(0,0,0,0.3)]'
            : isActive
              ? 'border-white/[0.18] shadow-[0_8px_32px_rgba(0,0,0,0.35)]'
              : isPreview1
                ? 'border-white/[0.12] shadow-[0_22px_70px_rgba(0,0,0,0.55)]'
                : 'border-white/[0.12] shadow-[0_18px_55px_rgba(0,0,0,0.45)]'
        }`}
        style={cardStyle}
      >
        {/* Animated Running Border Glow - Active Card Only (Desktop only for performance) */}
        {isActive && !prefersReducedMotion && !isMobile && (
          <>
            {/* Rotating conic gradient border */}
            <div 
              className="absolute inset-0 rounded-[18px] pointer-events-none"
              style={{
                padding: '1px',
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(207, 174, 82, 0.5) 10%, rgba(255, 255, 255, 0.3) 20%, transparent 30%, transparent 70%, rgba(207, 174, 82, 0.4) 85%, transparent 95%)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                animation: 'rotateBorder 6s linear infinite',
                zIndex: 2
              }}
            />
            {/* Subtle outer glow */}
            <div 
              className="absolute inset-0 rounded-[18px] pointer-events-none"
              style={{
                boxShadow: '0 0 24px rgba(207, 174, 82, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                zIndex: 1
              }}
            />
          </>
        )}

        {/* Top radial highlight for depth */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-20 pointer-events-none z-5"
          style={{
            background: 'radial-gradient(ellipse at center top, rgba(255, 255, 255, 0.06) 0%, transparent 70%)'
          }}
        />

        {/* Card Content */}
        <div className="relative z-10 p-5 md:p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-white/[0.16]">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ring-1 transition-all duration-[550ms] ${
                isHighlighted
                  ? 'bg-brand-gold/[0.22] ring-brand-gold/40'
                  : 'bg-brand-gold/[0.18] ring-brand-gold/30'
              }`}>
                <IconComponent className="w-4 h-4 text-brand-gold" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-white/95 tracking-wide" data-lens="on">
                {category.title}
              </h3>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold bg-white/[0.10] text-white/75 rounded-lg border border-white/[0.16]">
              {category.skills.length}
            </span>
          </div>

          {/* Full-width skill rows - Mobile: no nested scroll, Desktop: allow scroll */}
          <motion.div 
            className="flex-1 space-y-2 md:overflow-y-auto overflow-x-hidden skills-scroll pr-2 md:pr-0"
            style={{
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch'
            }}
            variants={skillListContainer}
            initial={false}
            animate={isActive ? "show" : "hidden"}
          >
            {category.skills.map((skill) => (
              <motion.div
                key={skill}
                variants={skillListItem}
                transition={{ 
                  duration: 0.22, 
                  ease: EASE_OUT_QUART 
                }}
                className="w-full max-w-full px-3 md:px-4 py-2.5 flex items-center space-x-3 rounded-full border transition-all duration-[500ms] hover:border-white/[0.28] hover:bg-white/[0.09] cursor-default overflow-hidden"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'rgba(255, 255, 255, 0.16)'
                }}
                data-lens="on"
              >
                {/* Tiny dot indicator */}
                <div className="w-1.5 h-1.5 rounded-full bg-brand-gold/70 flex-shrink-0" />
                
                {/* Skill text - Mobile-optimized with text truncation */}
                <span className="text-sm font-medium flex-1 text-white/92 truncate min-w-0">
                  {skill}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
})

export default SkillsSection
