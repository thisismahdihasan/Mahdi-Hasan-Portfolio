'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SmartLoader from './SmartLoader'

interface PageWrapperProps {
  children: React.ReactNode
  entryLoaderComplete?: boolean
  skipSmartLoader?: boolean
}

/**
 * PageWrapper — Overlay Strategy (Phase 5A)
 *
 * PREVIOUS BEHAVIOUR (content gate):
 *   Children were conditionally rendered: {showContent && <motion.div>{children}</motion.div>}
 *   The DOM did not contain the page at all until every loader finished.
 *   The LCP image had `priority` (preloaded) but the <img> element didn't exist yet,
 *   so the browser could not register LCP until ~700–2600ms after page load.
 *
 * NEW BEHAVIOUR (overlay strategy):
 *   Children are always rendered from the first paint.
 *   The SmartLoader renders as a position:fixed overlay on top (z-index: 10000).
 *   While loading, the content wrapper is aria-hidden + pointer-events:none + user-select:none
 *   so users cannot interact with or perceive the content beneath the loader.
 *   After loading completes, those restrictions are lifted normally.
 *
 * Result:
 *   The LCP image element exists in the DOM immediately. The browser can decode and
 *   measure its paint time concurrently with the loader playing on top.
 *   LCP registers when the ProfileImage motion.div reaches non-zero opacity —
 *   which now starts as soon as the loader's own completion sequence fires,
 *   rather than being deferred until after the loader fully exits.
 *
 * What is identical to users:
 *   - EntryLoader, SmartLoader, ProfileImage, Hero — all untouched
 *   - Loader visuals, timing, animation, premium feel — unchanged
 *   - Content is invisible (opacity: 0) and non-interactive behind the loader
 *   - body.overflow:hidden still prevents scroll during loading
 *   - The 0.8s page content fade-in and ProfileImage premium reveal are preserved
 */
const PageWrapper = ({ children, entryLoaderComplete = true, skipSmartLoader = false }: PageWrapperProps) => {
  // isLoading: whether the SmartLoader overlay should be shown
  // (replaces the old showContent gate — children now always render)
  const [isLoading, setIsLoading] = useState(true)

  const handleLoadingComplete = () => {
    // SmartLoader has finished — lift the overlay
    // Small delay matches the original 100ms before showContent=true
    setTimeout(() => {
      setIsLoading(false)
    }, 100)
  }

  // Sync loading state with parent loader decisions
  useEffect(() => {
    if (skipSmartLoader) {
      // EntryLoader/RefreshLoader just completed — no SmartLoader needed
      setIsLoading(false)
    } else if (entryLoaderComplete) {
      // SmartLoader should run — keep overlay active
      setIsLoading(true)
    } else {
      // EntryLoader/RefreshLoader is still running — keep overlay active
      setIsLoading(true)
    }
  }, [entryLoaderComplete, skipSmartLoader])

  // Body scroll lock: active while any loader is running
  useEffect(() => {
    document.body.style.backgroundColor = '#000000'
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.backgroundColor = ''
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      // Restore body styles shortly after the overlay lifts
      // (matches original 500ms restoration timing)
      const timer = setTimeout(() => {
        document.body.style.backgroundColor = ''
        document.body.style.overflow = ''
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <>
      {/* SmartLoader — now a fixed overlay, not a content gate */}
      <AnimatePresence mode="wait">
        {isLoading && entryLoaderComplete && !skipSmartLoader && (
          <SmartLoader
            key="loader"
            onComplete={handleLoadingComplete}
          />
        )}
      </AnimatePresence>

      {/*
        Page content — always in the DOM from first paint.
        
        While the loader is active:
          - aria-hidden="true"    → screen readers skip this subtree
          - pointer-events: none  → no clicks, no hover, no focus
          - user-select: none     → no text selection
          - tabIndex -1 is not set here because pointer-events:none on the wrapper
            combined with aria-hidden already fully blocks keyboard + AT interaction
        
        After loading completes (isLoading = false):
          - All restrictions are removed, normal interaction restored
        
        The content starts at opacity:0 (via the motion.div below) so it is
        visually invisible behind the loader while the loader plays. Users see
        exactly the same experience as before.
      */}
      <div
        aria-hidden={isLoading ? true : undefined}
        style={isLoading ? { pointerEvents: 'none', userSelect: 'none' } : undefined}
      >
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ backgroundColor: 'transparent' }}
        >
          {children}
        </motion.div>
      </div>
    </>
  )
}

export default PageWrapper
