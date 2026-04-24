'use client'

import { useEffect } from 'react'
import type { Project } from '@/types/project'

interface WorkSummaryModalProps {
  active: Project
  onClose: () => void
}

const WorkSummaryModal = ({ active, onClose }: WorkSummaryModalProps) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open - Enhanced for mobile/tablet
  useEffect(() => {
    // Store original overflow value
    const originalOverflow = document.body.style.overflow
    
    // Disable scroll
    document.body.style.overflow = 'hidden'
    
    // Also prevent scroll on document element for better mobile support
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      // Restore original overflow
      document.body.style.overflow = originalOverflow
      document.documentElement.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] md:bg-black/80 backdrop-blur-md md:backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/[0.08] border border-white/[0.16] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:backdrop-blur-md max-w-2xl w-full max-h-[80vh] overflow-y-auto desktop-hide-scrollbar relative">
        {/* Close Button - Positioned absolutely in top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex-shrink-0 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors duration-300 flex items-center justify-center z-[60]"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="p-6 md:p-8 pb-10">
          <div className="mb-6 pr-12">
            <h3 className="text-2xl font-bold text-white" data-lens="on">
              SwashPeak Work Summary
            </h3>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-white font-semibold mb-3" data-lens="on">What I Delivered</h4>
              <ul className="space-y-2">
                {active.bullets?.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-3" data-lens="on">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-gold/70 mt-2.5 flex-shrink-0" />
                    <span className="text-white/80 leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2" data-lens="on">Role</h4>
              <p className="text-white/80 leading-relaxed" data-lens="on">
                Frontend Developer (Client Project)
              </p>
              <p className='text-white/80 text-sm'>
                - Built on Shopify theme customization
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2" data-lens="on">Technologies</h4>
              <p className="text-white/80 leading-relaxed" data-lens="on">
                {active.tech.join(' • ')}
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2" data-lens="on">Impact</h4>
              <p className="text-white/80 leading-relaxed" data-lens="on">
                Shipped a cleaner, fully responsive storefront with improved navigation and category structure—making it easier for customers to browse products across mobile, tablet, and desktop.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkSummaryModal