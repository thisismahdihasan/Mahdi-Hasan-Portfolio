'use client'

import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { EASE_OUT } from '@/lib/animations'
import { useMobile } from '@/hooks/useMediaQueries'

interface ProfileImageProps {
  entryRevealReady?: boolean
  profileImageUrl?: string
}

const ProfileImage = ({ entryRevealReady = true, profileImageUrl }: ProfileImageProps) => {
  // Use shared mobile detection hook for better performance
  const isMobile = useMobile()

  const imageVariants: Variants = {
    hidden: { 
      opacity: 0,
      filter: isMobile ? "none" : "blur(14px)", // No blur animation on mobile
      scale: 1.03
    },
    show: { 
      opacity: 1,
      filter: isMobile ? "none" : "blur(0px)", // No blur animation on mobile
      scale: 1,
      transition: {
        duration: isMobile ? 0.5 : 0.8, // Faster on mobile
        delay: 0.2,
        ease: EASE_OUT
      }
    }
  }

  return (
    <div 
      className="profile-image w-full h-[360px] sm:h-[420px] md:h-[520px] lg:h-screen relative overflow-visible lg:overflow-hidden"
      style={{ 
        zIndex: 100, 
        opacity: 1, 
        visibility: 'visible',
        display: 'block'
      }}
    >
      <motion.div
        className="relative w-full h-full group"
        variants={imageVariants}
        initial="hidden"
        animate={entryRevealReady ? "show" : "hidden"}
        whileHover={!isMobile ? { scale: 1.05 } : {}} // Disable hover on mobile
        style={{ 
          opacity: 1, 
          visibility: 'visible', 
          display: 'block',
          // Fallback to ensure no permanent blur
          filter: entryRevealReady ? (isMobile ? "none" : "blur(0px)") : undefined
        }}
      >
        <Image
          alt="Professional portrait of Mahdi Hasan"
          className="w-full h-full object-contain lg:object-cover grayscale group-hover:grayscale-0 transition-all duration-300 ease-out"
          src={profileImageUrl || '/formal_Img_org.webp'}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 45vw"
          style={{ 
            zIndex: 50, 
            opacity: 1, 
            visibility: 'visible',
            display: 'block'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 dark:from-black/50 dark:via-transparent dark:to-black/20 pointer-events-none z-40" />
      </motion.div>
    </div>
  )
}

export default ProfileImage