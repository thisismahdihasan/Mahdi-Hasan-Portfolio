'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { EASE_OUT } from '@/lib/animations'

const Navbar = ({ entryRevealReady = true }: { entryRevealReady?: boolean }) => {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home') // Default to home instead of projects
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Enhanced scroll lock effect for mobile menu - preserves overflow-x behavior
  useEffect(() => {
    if (mobileMenuOpen) {
      // Store original overflow values for both body and html
      const originalBodyOverflow = document.body.style.overflow
      const originalBodyOverflowX = document.body.style.overflowX
      const originalHtmlOverflow = document.documentElement.style.overflow
      const originalHtmlOverflowX = document.documentElement.style.overflowX
      
      // Disable vertical scroll but preserve horizontal overflow protection
      document.body.style.overflow = 'hidden'
      document.body.style.overflowX = 'hidden' // Ensure horizontal is locked
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.overflowX = 'hidden' // Critical for layout stability
      
      return () => {
        // ✅ CRITICAL FIX: Properly restore scroll without forcing overflowX to hidden
        // This was causing the scroll freeze - we were forcing overflowX to 'hidden' instead of restoring original values
        document.body.style.overflow = originalBodyOverflow || ''
        document.body.style.overflowX = originalBodyOverflowX || ''
        document.documentElement.style.overflow = originalHtmlOverflow || ''
        document.documentElement.style.overflowX = originalHtmlOverflowX || ''
        
        // Let CSS handle the overflow-x: clip from globals.css
        // Don't force it to 'hidden' which conflicts with the CSS
      }
    }
  }, [mobileMenuOpen])

  // Auto-close menu on scroll (UX improvement)
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleScroll = () => {
      setMobileMenuOpen(false)
    }

    // Add scroll listener when menu is open
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80)
    }

    // IntersectionObserver for all sections including hero
    const sections = ['hero', 'skills', 'projects', 'about', 'contact']
    const ratiosRef = new Map<string, number>()
    
    const observers = sections.map(section => {
      const element = document.getElementById(section)
      if (!element) return null

      const observer = new IntersectionObserver(
        ([entry]) => {
          // Update the intersection ratio for this section
          if (entry.isIntersecting) {
            ratiosRef.set(section, entry.intersectionRatio)
          } else {
            ratiosRef.delete(section)
          }
          
          // Find the section with the highest intersection ratio
          if (ratiosRef.size > 0) {
            let bestSection = ''
            let highestRatio = 0
            
            ratiosRef.forEach((ratio, sectionId) => {
              if (ratio > highestRatio) {
                highestRatio = ratio
                bestSection = sectionId
              }
            })
            
            // Map hero to home for navbar display
            const activeSection = bestSection === 'hero' ? 'home' : bestSection
            setActiveSection(activeSection)
          }
        },
        { 
          threshold: [0, 0.1, 0.25, 0.4, 0.6], // Multiple thresholds for precise detection
          rootMargin: '-96px 0px -60% 0px' // Match navbar offset + bottom margin
        }
      )

      observer.observe(element)
      return observer
    })

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial check
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observers.forEach(observer => observer?.disconnect())
    }
  }, [])

  const handleNavClick = (sectionId: string) => {
    // Close mobile menu when nav item is clicked
    setMobileMenuOpen(false)
    
    // ✅ SAFETY FIX: Ensure scroll is always restored after navigation
    // Add a small delay to ensure the useEffect cleanup has run
    setTimeout(() => {
      // Force restore scroll if it's still locked
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = ''
        document.documentElement.style.overflow = ''
      }
    }, 100)
    
    if (sectionId === 'home') {
      // Scroll to very top for Home
      if ((window as any).lenis) {
        ;(window as any).lenis.scrollTo(0, {
          duration: 2.0,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        })
      } else {
        // Fallback to native scroll for mobile
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
    } else {
      const element = document.getElementById(sectionId)
      if (element) {
        if ((window as any).lenis) {
          ;(window as any).lenis.scrollTo(element, {
            offset: -96, // Match CSS scroll-padding-top
            duration: 2.0,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
          })
        } else {
          // Fallback to native scroll for mobile
          const elementTop = element.offsetTop - 96 // Account for navbar height
          window.scrollTo({
            top: elementTop,
            behavior: 'smooth'
          })
        }
      }
    }
  }

  const handleLogoClick = () => {
    // Close mobile menu and scroll to top
    setMobileMenuOpen(false)
    
    // Logo also scrolls to top
    if ((window as any).lenis) {
      ;(window as any).lenis.scrollTo(0, {
        duration: 2.0,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      })
    } else {
      // Fallback to native scroll for mobile
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' }
  ]

  const navbarVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.45, 
        ease: EASE_OUT 
      }
    }
  }

  // Mobile menu animation variants
  const mobileMenuVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: -20,
      transition: { 
        duration: 0.3, 
        ease: EASE_OUT 
      }
    },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4, 
        ease: EASE_OUT,
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  }

  const mobileMenuItemVariants: Variants = {
    hidden: { 
      opacity: 0, 
      x: -20 
    },
    show: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.3, 
        ease: EASE_OUT 
      }
    }
  }

  return (
    <>
      <motion.header 
        className="fixed top-0 left-0 right-0 z-[90] transition-all duration-300 ease-out"
        variants={navbarVariants}
        initial="hidden"
        animate={entryRevealReady ? "show" : "hidden"}
        style={{
          background: scrolled 
            ? 'rgba(0, 0, 0, 0.8)' 
            : 'transparent',
          backdropFilter: scrolled ? 'blur(12px) saturate(1.1)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px) saturate(1.1)' : 'none',
          borderBottom: scrolled 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-8">
          <div className="flex items-center justify-between h-16 relative">
            {/* Logo - Clickable to scroll to top */}
            <motion.div 
              className="cursor-pointer"
              data-lens="on"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={handleLogoClick}
            >
              <img 
                src="/mh.svg" 
                alt="MH Logo"
                width="26"
                height="26"
                className="h-5 md:h-[26px] w-auto transition-all duration-300 hover:opacity-90 hover:drop-shadow-[0_0_14px_rgba(223,181,42,0.18)]"
                onError={(e) => {
                  // Fallback to PNG if SVG fails
                  const target = e.target as HTMLImageElement;
                  target.src = "/mh(4x).png";
                }}
              />
            </motion.div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex">
              <ul className="flex items-center space-x-8">
                {navItems.map((item) => (
                  <li key={item.id} className="relative">
                    <button
                      onClick={() => handleNavClick(item.id)}
                      className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-gold transition-colors duration-300 ease-out py-2 px-1 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm"
                      data-lens="on"
                    >
                      {item.label}
                      {/* Active indicator - subtle underline */}
                      {activeSection === item.id && (
                        <motion.div
                          className="absolute -bottom-1 left-1/2 w-1 h-1 bg-brand-gold/60 rounded-full"
                          layoutId="activeIndicator"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          style={{ transform: 'translateX(-50%)' }}
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile Hamburger Button */}
            <button
              className="md:hidden p-1 text-neutral-600 dark:text-neutral-400 hover:text-brand-gold transition-colors duration-300 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-md"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              data-lens="on"
              style={{ minWidth: '40px', minHeight: '40px' }}
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay - Only render when open */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className="fixed inset-0 z-[80] bg-black/70 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenuOpen(false)}
            style={{ width: '100vw', maxWidth: '100%', overflowX: 'hidden' }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu - Only render when open to prevent invisible touch interception */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed top-16 left-0 right-0 z-[85] md:hidden"
            variants={mobileMenuVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            style={{ 
              maxWidth: '100vw', 
              overflowX: 'hidden',
              pointerEvents: 'auto' // Ensure pointer events work when open
            }}
          >
            <div className="bg-black/95 border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-full overflow-hidden">
              <motion.nav 
                className="px-6 py-6 max-w-7xl mx-auto"
                variants={mobileMenuVariants}
              >
                <motion.ul className="space-y-2" variants={mobileMenuVariants}>
                  {navItems.map((item) => (
                    <motion.li key={item.id} variants={mobileMenuItemVariants}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleNavClick(item.id)
                        }}
                        className={`block w-full text-left py-4 px-5 rounded-xl transition-all duration-300 touch-manipulation relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 ${
                          activeSection === item.id
                            ? 'bg-gradient-to-r from-brand-gold/10 to-brand-gold/5 text-brand-gold border-l-4 border-brand-gold shadow-[0_0_20px_rgba(207,174,82,0.15)]'
                            : 'text-white/85 hover:text-white hover:bg-white/5 active:bg-white/8 border-l-4 border-transparent'
                        }`}
                        data-lens="on"
                        style={{ 
                          minHeight: '56px', // Larger touch target
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '16px',
                          fontWeight: '500'
                        }}
                      >
                        {/* Active item glow effect */}
                        {activeSection === item.id && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-brand-gold/5 to-transparent rounded-xl"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                        
                        <span className="relative z-10">{item.label}</span>
                        
                        {/* Active indicator arrow */}
                        {activeSection === item.id && (
                          <motion.svg
                            aria-hidden="true"
                            className="w-4 h-4 ml-auto text-brand-gold relative z-10"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </motion.svg>
                        )}
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar