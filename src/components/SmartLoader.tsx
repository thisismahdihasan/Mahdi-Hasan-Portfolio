'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SmartLoaderProps {
  onComplete: () => void
}

const SmartLoader = ({ onComplete }: SmartLoaderProps) => {
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    // Check if user has visited before in this session
    const hasVisited = sessionStorage.getItem('hasVisited')
    
    if (hasVisited) {
      setIsFirstVisit(false)
      // Quick MH logo for returning visitors - optimized to 700ms total
      const timer = setTimeout(() => {
        setIsComplete(true)
        setTimeout(onComplete, 200)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      // Mark as visited for this session
      sessionStorage.setItem('hasVisited', 'true')
      
      // Show welcome immediately, then start countdown
      setShowWelcome(true)
      
      // Start countdown after welcome letters appear
      setTimeout(() => {
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev >= 100) {
              clearInterval(interval)
              // Complete after reaching 100
              setTimeout(() => {
                setIsComplete(true)
                setTimeout(onComplete, 1200) // Longer delay for cinematic effect
              }, 800)
              return 100
            }
            return prev + 1
          })
        }, 25) // Smooth countdown speed
      }, 1500) // Wait for welcome letters to appear
    }
  }, [onComplete])

  if (isComplete) return null

  const welcomeLetters = "WELCOME".split("")

  return (
    <motion.div
      className="fixed inset-0 z-[10000] bg-black flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait">
        {isFirstVisit ? (
          // First visit: Luxury Welcome with integrated countdown
          <motion.div
            key="welcome-countdown"
            className="text-center relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {/* Welcome Text with Letter Stagger */}
            <div className="relative">
              <div className="flex justify-center items-center space-x-2 md:space-x-4">
                {welcomeLetters.map((letter, index) => (
                  <motion.span
                    key={index}
                    className="text-6xl md:text-8xl lg:text-9xl font-light tracking-wider"
                    initial={{ 
                      opacity: 0, 
                      y: 50,
                      rotateX: -90
                    }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      rotateX: 0,
                      color: countdown > (index * 14) ? 'rgb(207 174 82)' : 'rgb(207 174 82 / 0.3)'
                    }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.8,
                      ease: "easeOut",
                      color: { duration: 0.3 }
                    }}
                    style={{
                      textShadow: countdown > (index * 14) 
                        ? '0 0 40px rgb(207 174 82 / 0.8), 0 0 80px rgb(207 174 82 / 0.4)' 
                        : '0 0 20px rgb(207 174 82 / 0.2)',
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
              
              {/* Countdown Display */}
              <motion.div
                className="mt-8 text-2xl md:text-3xl font-light text-brand-gold tracking-[0.3em]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
              >
                {countdown}%
              </motion.div>
              
              {/* Progress Bar */}
              <motion.div
                className="mt-4 w-64 md:w-80 h-0.5 bg-neutral-800 mx-auto rounded-full overflow-hidden"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 1.4, duration: 0.6, ease: "easeOut" }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-gold to-brand-gold-alt rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${countdown}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    boxShadow: '0 0 20px rgb(207 174 82 / 0.6)'
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          // Returning visitor: Pulsing MH logo
          <motion.div
            key="mh-logo"
            className="text-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <motion.div
              className="text-8xl md:text-9xl font-bold text-brand-gold tracking-wider"
              animate={prefersReducedMotion ? {} : { 
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
                textShadow: [
                  "0 0 40px rgb(207 174 82 / 0.6)",
                  "0 0 80px rgb(207 174 82 / 0.9)",
                  "0 0 40px rgb(207 174 82 / 0.6)"
                ]
              }}
              transition={prefersReducedMotion ? {} : { 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              MH
            </motion.div>
            
            {/* Orbital rings around MH */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-48 h-48 md:w-56 md:h-56 border border-brand-gold rounded-full opacity-30"
                animate={prefersReducedMotion ? {} : { rotate: 360 }}
                transition={prefersReducedMotion ? {} : { 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
              <motion.div
                className="absolute w-64 h-64 md:w-72 md:h-72 border border-brand-gold rounded-full opacity-20"
                animate={prefersReducedMotion ? {} : { rotate: -360 }}
                transition={prefersReducedMotion ? {} : { 
                  duration: 12, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default SmartLoader