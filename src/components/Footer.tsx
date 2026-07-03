'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, useInView } from 'framer-motion'

const Footer = () => {
  const [currentTime, setCurrentTime] = useState('')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const footerRef = useRef<HTMLElement>(null)
  
  // Trigger when footer top is 100px away from bottom of viewport
  const isInView = useInView(footerRef, { 
    once: true, 
    margin: "0px 0px -100px 0px"
  })

  // Memoize the time update function to prevent recreation on every render
  const updateTime = useCallback(() => {
    const now = new Date()
    const dhakaTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(now)
    setCurrentTime(dhakaTime)
  }, [])

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    // Add listener for media query changes
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleMediaQueryChange)
    
    updateTime()
    const interval = setInterval(updateTime, 1000)

    // Cleanup function to prevent memory leaks
    return () => {
      clearInterval(interval)
      mediaQuery.removeEventListener('change', handleMediaQueryChange)
    }
  }, [updateTime])

  return (
    <footer 
      ref={footerRef}
      className="section-gap bg-transparent px-6 md:px-8 overflow-hidden mt-28 pb-16 md:pb-12"
    >
      {/* Single animated wrapper - fade + slide-up on scroll reveal */}
      <motion.div 
        className="max-w-7xl mx-auto relative"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
        animate={{ 
          opacity: isInView ? 1 : 0, 
          y: isInView ? 0 : (prefersReducedMotion ? 0 : 20)
        }}
        transition={{ 
          duration: 0.4, 
          ease: "easeOut" // Snappier easing for faster initial movement
        }}
        style={{ 
          willChange: 'transform, opacity' // Performance optimization
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-12 relative z-10">
          <div className="space-y-6 w-full md:w-auto">
            <div className="w-full overflow-visible">
              <h2 aria-hidden="true" className="text-5xl sm:text-6xl md:text-7xl lg:text-[12rem] font-black text-white leading-none tracking-tighter opacity-10 select-none text-center md:text-left max-w-full">
                MAHDI
              </h2>
            </div>
            <p className="text-zinc-500 max-w-sm text-sm md:text-lg">
              Thanks for stopping by. Let's turn ideas into clean, responsive UI.
            </p>
            
            {/* Status Pills - Compact & Subtle */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/3 border border-white/5 text-zinc-400 text-xs">
                Open to roles
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/3 border border-white/5 text-zinc-400 text-xs">
                Freelance available
              </span>
            </div>

            {/* Single Email Action */}
            <div className="mt-4">
              <motion.div 
                className="relative p-[1px] overflow-hidden rounded-lg bg-white/10 w-fit"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {/* The Glow (Sharp Laser Beam) — disabled for reduced-motion users */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, #D4AF37 180deg, transparent 200deg)`,
                    filter: 'blur(4px)'
                  }}
                  animate={prefersReducedMotion ? {} : { rotate: [0, 360] }}
                  transition={prefersReducedMotion ? {} : {
                    duration: 3,
                    ease: "linear",
                    repeat: Infinity
                  }}
                />
                
                {/* The Button */}
                <a 
                  href="mailto:hasanmahdi6060@gmail.com"
                  className="relative z-10 bg-black rounded-[7px] flex items-center justify-center px-4 py-2 text-zinc-300 hover:text-white transition-colors duration-300 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40"
                  style={{ margin: '1px' }}
                  aria-label="Email Mahdi"
                >
                  Email me
                </a>
              </motion.div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">
              Local Time / Dhaka, BD
            </p>
            <p className="text-2xl font-medium text-white">
              <span className="text-emerald-500 mr-2 animate-pulse">●</span>
              {currentTime && (
                <span className="text-zinc-300 text-lg font-mono">
                  {currentTime}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-12"></div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 px-4 md:px-0">
          <p className="text-zinc-600 text-xs md:text-sm">
            © 2026 Mahdi Hasan. All rights reserved.
          </p>
          
          <div className="flex flex-wrap gap-x-6 gap-y-3 justify-center">
            <a 
              href="https://www.linkedin.com/in/mahdi9162/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs uppercase tracking-widest text-white/60 hover:text-primary hover:underline underline-offset-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
              data-lens="on"
            >
              LinkedIn
            </a>
            <a 
              href="https://github.com/mahdi9162" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs uppercase tracking-widest text-white/60 hover:text-primary hover:underline underline-offset-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
              data-lens="on"
            >
              GitHub
            </a>
            <a 
              href="https://www.facebook.com/mahdi916/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs uppercase tracking-widest text-white/60 hover:text-primary hover:underline underline-offset-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm"
              data-lens="on"
            >
              Facebook
            </a>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}

export default Footer