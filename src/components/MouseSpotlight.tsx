'use client'

import { useEffect, useRef } from 'react'

/**
 * MouseSpotlight — radial gradient that follows the cursor.
 *
 * Performance fix: CSS custom properties are updated via direct DOM mutation
 * (divRef.current.style.setProperty) instead of React state. This eliminates
 * the ~60Hz React re-render cycle that the previous useState approach caused,
 * while producing an identical visual output.
 */
const MouseSpotlight = () => {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = divRef.current
    if (!el) return

    const handleMouseMove = (e: MouseEvent) => {
      el.style.setProperty('--mouse-x', `${e.clientX}px`)
      el.style.setProperty('--mouse-y', `${e.clientY}px`)
      el.classList.add('active')
    }

    const handleMouseLeave = () => {
      el.classList.remove('active')
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return <div ref={divRef} className="mouse-spotlight" />
}

export default MouseSpotlight
