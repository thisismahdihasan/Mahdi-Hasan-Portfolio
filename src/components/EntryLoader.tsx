'use client'

import { useState, useEffect } from 'react'

interface EntryLoaderProps {
  onComplete: () => void
}

const EntryLoader = ({ onComplete }: EntryLoaderProps) => {
  const [progress, setProgress] = useState(0)
  const [showDoorTransition, setShowDoorTransition] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    // Lock body scroll on mount
    document.body.style.overflow = 'hidden'
    
    return () => {
      // Restore body scroll on unmount
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    // Progress animation over 1.5 seconds (0 to 100%)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 6.67 // 100% over 1.5 seconds (6.67% every 100ms)
      })
    }, 100)

    // Start curtain reveal transition after 1.5 seconds
    const curtainTimer = setTimeout(() => {
      setShowDoorTransition(true)
      
      // Complete and trigger page reveal after 100ms (at 1.6s total) to prevent blank screen
      setTimeout(() => {
        sessionStorage.setItem('entryLoaderSeen', '1')
        sessionStorage.setItem('welcomeShown', '1') // Mark welcome as shown
        onComplete()
      }, 100) // 100ms delay so Hero starts at exactly 1.6s
    }, 1500) // 1.5s total duration

    return () => {
      clearInterval(progressInterval)
      clearTimeout(curtainTimer)
    }
  }, [onComplete])

  // Calculate stroke-dashoffset for ring (276 is circumference)
  const strokeDashoffset = 276 - (progress / 100) * 276

  return (
    <>
      <style>{`
        /*
         * goldGlow — optimized: animated text-shadow replaced with
         * opacity-animated ::before pseudo-element carrying a static drop-shadow.
         * Only opacity animates → GPU-composited, no per-frame repaint.
         * The W remains text-[#D4AF37] at full opacity; the glow layer pulses behind it.
         */
        @keyframes goldGlowLayer {
          0%, 100% { opacity: 0.55; }
          50%       { opacity: 1;    }
        }

        .gold-glow-letter {
          position: relative;
          display: inline-block;
        }

        .gold-glow-letter::before {
          content: "W";
          position: absolute;
          inset: 0;
          color: transparent;
          /* Static drop-shadow — painted once at promotion time, not per frame */
          filter: drop-shadow(0 0 28px rgb(212 175 55 / 0.9))
                  drop-shadow(0 0 56px rgb(212 175 55 / 0.5));
          animation: goldGlowLayer 2s ease-in-out infinite;
          pointer-events: none;
          font: inherit;
          letter-spacing: inherit;
          line-height: inherit;
        }

        .gold-glow-letter-reduced {
          position: relative;
          display: inline-block;
        }

        .gold-glow-letter-reduced::before {
          content: "W";
          position: absolute;
          inset: 0;
          color: transparent;
          filter: drop-shadow(0 0 20px rgb(212 175 55 / 0.4));
          pointer-events: none;
          font: inherit;
          letter-spacing: inherit;
          line-height: inherit;
        }

        /*
         * lightSweep — rolled back to original background-position approach.
         * The transform:translateX overlay caused a visible gold rectangle over
         * the text area, which is a premium-feel regression.
         * background-clip:text is the only technique that constrains the shimmer
         * to glyph pixels; there is no composited equivalent that is visually
         * identical. Keeping paint accuracy over compositing here.
         */
        @keyframes lightSweep {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }

        .light-sweep {
          background: linear-gradient(
            90deg,
            transparent 0%,
            transparent 40%,
            rgba(212, 175, 55, 0.3) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: lightSweep 2s ease-in-out infinite;
          -webkit-background-clip: text;
          background-clip: text;
        }

        .gold-glow-disabled {
          text-shadow: 0 0 20px rgb(212 175 55 / 0.4);
        }
      `}</style>

      <div 
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden ${
          showDoorTransition ? 'pointer-events-none' : ''
        }`}
      >
        {/* Top Curtain Panel */}
        <div 
          className={`absolute top-0 left-0 w-full h-1/2 bg-black border-b border-white/5 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            showDoorTransition ? '-translate-y-full' : 'translate-y-0'
          }`}
        />
        
        {/* Bottom Curtain Panel */}
        <div 
          className={`absolute bottom-0 left-0 w-full h-1/2 bg-black border-t border-white/5 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            showDoorTransition ? 'translate-y-full' : 'translate-y-0'
          }`}
        />
        
        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* WELCOME Text */}
          <h1 className="text-[clamp(56px,10vw,120px)] md:text-9xl font-black text-white tracking-tighter leading-none mb-8">
            {/* W — composited glow via opacity-animated ::before pseudo-element */}
            <span
              className={
                prefersReducedMotion
                  ? 'gold-glow-letter-reduced text-[#D4AF37]'
                  : 'gold-glow-letter text-[#D4AF37]'
              }
            >
              W
            </span>
            {/* ELCOME — original background-clip:text shimmer (visual fidelity preserved) */}
            <span className={prefersReducedMotion ? '' : 'light-sweep'}>
              ELCOME
            </span>
            <span className="text-[#D4AF37]">.</span>
          </h1>
          
          {/* Progress Ring — unchanged */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg aria-hidden="true" className="w-full h-full -rotate-90">
              {/* Background ring */}
              <circle 
                cx="48" 
                cy="48" 
                r="44" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="transparent" 
                className="text-zinc-900"
              />
              {/* Progress ring */}
              <circle 
                cx="48" 
                cy="48" 
                r="44" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="transparent" 
                strokeDasharray="276" 
                strokeDashoffset={strokeDashoffset}
                className="text-[#D4AF37] transition-all duration-75 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 8px rgb(212 175 55 / 0.6))'
                }}
              />
            </svg>
            {/* Percentage Text */}
            <span className="absolute text-sm font-mono text-white">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default EntryLoader
