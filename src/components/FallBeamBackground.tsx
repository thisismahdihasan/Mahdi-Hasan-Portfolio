'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useMobile } from '@/hooks/useMediaQueries'

// Define the component's props for flexibility and professionalism
interface FallBeamBackgroundProps {
  /**
   * Optional Tailwind CSS class name to apply to the main container.
   * Useful for layout adjustments or margins.
   */
  className?: string;
  /**
   * Number of lines (beams) to render. Default is 20.
   */
  lineCount?: number;
  /**
   * Text to display over the beam effect.
   */
  displayText?: string;
  /**
   * Tailwind color class for the glowing beam trail.
   * E.g., 'blue-400', 'green-400', 'red-400'. Default is 'cyan-400'.
   */
  beamColorClass?: string;
}

/**
 * A lightweight, theme-aware falling beam background component.
 * It dynamically creates vertical beam lines via JavaScript/React and applies CSS animations.
 *
 * NOTE: Ensure the parent container has a defined height/width and `position: relative`
 * for the background to cover it correctly.
 */
const FallBeamBackground: React.FC<FallBeamBackgroundProps> = ({
  className = '',
  lineCount = 100, // Increased to 100 for premium density
  displayText,
  beamColorClass = 'cyan-400',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  // Use shared mobile detection hook for better performance
  const isMobile = useMobile()

  // Page Visibility API - pause beams when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (containerRef.current) {
        const lines = containerRef.current.querySelectorAll('.fall-beam-line')
        lines.forEach(line => {
          const element = line as HTMLElement
          if (document.hidden) {
            element.style.animationPlayState = 'paused'
          } else {
            element.style.animationPlayState = 'running'
          }
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Optimize line count for mobile
  const optimizedLineCount = isMobile ? Math.floor(lineCount * 0.6) : lineCount

  // --- CSS Styles for the effect ---
  const dynamicStyles = `
    .fall-beam-line {
      position: absolute;
      /* Background for the line itself (dim white) */
      height: 100%; /* Cover the full height of the container */
      z-index: 1; /* Ensure it stays behind all content */
      mix-blend-mode: screen;
      pointer-events: none; /* Ensure no interference with clicks */
      animation: pulse-opacity var(--pulse-duration) var(--pulse-delay) ease-in-out infinite;
    }
    
    .fall-beam-line::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      /* Dynamic beam glow color gradient */
      background: linear-gradient(to bottom,
        rgba(255, 255, 255, 0),
        var(--beam-glow-color));
      /* translateY: GPU-composited, no layout recalculation per frame.
         Starts fully above the container (-glow-height), exits at 100vh. */
      animation: fall var(--ani-duration) var(--ani-delay) cubic-bezier(0.11, 0, 0.5, 0) infinite;
      filter: blur(0.8px) drop-shadow(0 0 8px rgba(212, 175, 55, 0.3));
      height: var(--glow-height);
    }
    
    @keyframes fall {
      0%   { transform: translateY(calc(-1 * var(--glow-height))); }
      100% { transform: translateY(100vh); }
    }
    
    @keyframes pulse-opacity {
      0%, 100% { opacity: 0.1; }
      50% { opacity: 0.4; } /* Safe visibility peak */
    }
  `

  // Map Tailwind color to an RGB or RGBA value for the CSS variable
  const getColorValue = (colorClass: string): string => {
    switch (colorClass) {
      case 'green-400': return 'rgba(74, 222, 128, 0.7)' // green-400
      case 'cyan-400': return 'rgba(34, 211, 238, 0.7)'  // cyan-400
      case 'blue-400': return 'rgba(96, 165, 250, 0.7)'  // blue-400
      case 'red-400': return 'rgba(248, 113, 113, 0.7)'  // red-400
      case 'indigo-400': return 'rgba(129, 140, 248, 0.7)' // indigo-400
      case 'golden': return 'rgba(212, 175, 55, 0.45)' // Professional gold with lower alpha
      default: return 'rgba(212, 175, 55, 0.45)' // Default to professional golden
    }
  }

  // Fade-in sync: TEMPORARILY DISABLED - Start fade-in exactly 1.5 seconds after page load (matches Welcome Loader)
  useEffect(() => {
    // Temporarily show immediately for debugging
    setIsVisible(true)
    
    // const timer = setTimeout(() => {
    //   setIsVisible(true)
    // }, 1500) // 1.5 second delay to sync with Welcome Loader

    // return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Fix SSR Issues: Only run on client-side
    if (typeof document === 'undefined' || !containerRef.current) return

    const container = containerRef.current
    
    // Clear any previous lines before rendering new ones (important for re-renders and Strict Mode)
    const existingLines = container.querySelectorAll('.fall-beam-line')
    existingLines.forEach(line => line.remove())

    const glowColor = getColorValue(beamColorClass)

    for (let i = 1; i <= optimizedLineCount; i++) {
      const line = document.createElement("div")
      line.classList.add("fall-beam-line")

      // Calculate the 'left' position with a slight random jitter
      const leftPosition = `${i * (100 / optimizedLineCount) + Math.random() * 5 - 5}%`

      // Randomize top position for natural asynchronous flow
      const randomStartingTop = Math.random() * -100 + "%"

      // Break uniformity with randomized opacity for depth
      const opacity = 0.1 + Math.random() * 0.4

      // Natural Randomness: Ghost-like appearance with subtle variations
      const glowHeight = "150px" // Fixed 150px trail height
      const beamWidth = "1.5px" // Fixed 1.5px width

      // Infinite Asynchronous Flow: Optimize for mobile
      const duration = isMobile 
        ? 20 + Math.random() * 25 + "s" // 20-45s range (slower on mobile)
        : 15 + Math.random() * 30 + "s" // 15-45s range
      const delay = -Math.random() * 60 + "s" // -60s to 0s range

      // Smooth visibility transition with randomized timing
      const pulseDuration = isMobile
        ? 10 + Math.random() * 15 + "s" // 10-25s pulse range (slower on mobile)
        : 8 + Math.random() * 12 + "s" // 8-20s pulse range
      const pulseDelay = -Math.random() * 20 + "s" // -20s to 0s pulse delay

      // Apply CSS variables for the animation and styling
      line.style.setProperty("left", leftPosition)
      line.style.setProperty("top", randomStartingTop)
      line.style.setProperty("width", beamWidth)
      line.style.setProperty("opacity", opacity.toString())
      line.style.setProperty("--ani-duration", duration)
      line.style.setProperty("--ani-delay", delay)
      line.style.setProperty("--beam-glow-color", glowColor)
      line.style.setProperty("--glow-height", glowHeight)
      line.style.setProperty("--pulse-duration", pulseDuration)
      line.style.setProperty("--pulse-delay", pulseDelay)

      container.appendChild(line)
    }

    // Cleanup function to remove elements when component unmounts (prevents memory leaks)
    return () => {
      if (container) {
        const lines = container.querySelectorAll('.fall-beam-line')
        lines.forEach(line => line.remove())
      }
    }
  }, [optimizedLineCount, beamColorClass, isMobile]) // Re-run effect if these props change

  return (
    <>
      {/* Apply dynamic styles once */}
      <style>{dynamicStyles}</style>
      
      {/* Main container - Full document height coverage */}
      <div
        ref={containerRef}
        className={`fixed inset-0 overflow-hidden bg-transparent ${className}`}
        style={{ 
          opacity: 1, // Keep at full opacity to prevent beams from disappearing
          zIndex: 1, // Behind all content but above background
          height: '100vh', // Full viewport height
          minHeight: '100%', // Ensure it covers full document
          pointerEvents: 'none' // Ensure no interference with clicks
        }}
      >
        {displayText && (
          // Text overlay
          <h1 className="relative z-20 grid place-content-center h-full font-sans text-4xl sm:text-5xl lg:text-7xl font-bold text-white p-4 text-center">
            {displayText}
            {/* Gradient to fade the text bottom into the background */}
            <div 
              className="absolute inset-0 z-30 pointer-events-none" 
              style={{
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.95) 100%)'
              }} 
            />
          </h1>
        )}
        {/* The lines are rendered dynamically in the useEffect hook */}
      </div>
    </>
  )
}

export default FallBeamBackground