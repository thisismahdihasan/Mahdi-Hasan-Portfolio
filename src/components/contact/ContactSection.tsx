'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Mail, MapPin, Phone } from 'lucide-react'
import { EASE_OUT_QUART } from '@/lib/animations'
import toast from 'react-hot-toast'
import { useMobile } from '@/hooks/useMediaQueries'

interface FormData {
  name: string
  email: string
  phone: string
  message: string
  honeypot: string
}

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

const ContactSection = () => {
  // Use shared mobile detection hook for better performance
  const isMobile = useMobile()
  const [isMounted, setIsMounted] = useState(false) // Track component mount status
  
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    honeypot: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // ✅ Memoize animation variants - mobile-optimized
  const containerVariants: Variants = useMemo(() => ({
    show: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)",
      transition: { 
        duration: isMobile ? 0.4 : 0.6, 
        ease: EASE_OUT_QUART, 
        staggerChildren: 0.08, 
        delayChildren: 0 
      }
    },
    hide: { 
      // IMPORTANT: never fully hide the whole section
      opacity: 1,                 // was 0
      y: isMobile ? 20 : 8,       // Reduced y-offset on mobile
      filter: isMobile ? "blur(4px)" : "blur(2px)", // Reduced blur on mobile
      transition: { 
        duration: isMobile ? 0.4 : 0.35, 
        ease: EASE_OUT_QUART 
      }
    }
  }), [isMobile])

  const leftVariants: Variants = useMemo(() => ({
    show: { 
      opacity: 1, 
      x: 0, 
      y: 0, 
      filter: "blur(0px)",
      transition: { 
        duration: isMobile ? 0.4 : 0.6, 
        ease: EASE_OUT_QUART 
      }
    },
    hide: { 
      opacity: 0.65,              // was 0
      x: isMobile ? -20 : -10,    // Reduced x-offset on mobile
      y: isMobile ? 20 : 8,       // Reduced y-offset on mobile
      filter: isMobile ? "blur(4px)" : "blur(3px)", // Reduced blur on mobile
      transition: { 
        duration: isMobile ? 0.4 : 0.35, 
        ease: EASE_OUT_QUART 
      }
    }
  }), [isMobile])

  const rightVariants: Variants = useMemo(() => ({
    show: { 
      opacity: 1, 
      x: 0, 
      y: 0, 
      filter: "blur(0px)",
      transition: { 
        duration: isMobile ? 0.4 : 0.6, 
        ease: EASE_OUT_QUART 
      }
    },
    hide: { 
      opacity: 0.65,              // was 0
      x: isMobile ? 20 : 10,      // Reduced x-offset on mobile
      y: isMobile ? 20 : 8,       // Reduced y-offset on mobile
      filter: isMobile ? "blur(4px)" : "blur(3px)", // Reduced blur on mobile
      transition: { 
        duration: isMobile ? 0.4 : 0.35, 
        ease: EASE_OUT_QUART 
      }
    }
  }), [isMobile])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !isMounted) return

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const apiRes = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          message: formData.message,
          honeypot: formData.honeypot,
          source_page: typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
      })

      if (!isMounted) return

      if (apiRes.status === 429) {
        toast.error('Too many messages. Please try again later.', {
          duration: 6000,
          style: {
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ffffff',
          },
        })
        setSubmitStatus('error')
        setTimeout(() => { if (isMounted) setSubmitStatus('idle') }, 5000)
        return
      }

      if (!apiRes.ok) {
        throw new Error(`Server error: ${apiRes.status}`)
      }

      // ── Success ──────────────────────────────────────────────────────────
      toast.success("Message sent successfully! I'll get back to you soon.", {
        duration: 5000,
        style: {
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#ffffff',
        },
      })

      setSubmitStatus('success')

      setTimeout(() => {
        if (!isMounted) return
        setFormData({ name: '', email: '', phone: '', message: '', honeypot: '' })
        setSubmitStatus('idle')
      }, 3000)

    } catch (error) {
      console.error('[ContactSection] Submit failed:', error)

      if (!isMounted) return

      toast.error('Failed to send message. Please try again or contact me directly.', {
        duration: 6000,
        style: {
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ffffff',
        },
      })

      setSubmitStatus('error')

      setTimeout(() => { if (isMounted) setSubmitStatus('idle') }, 5000)

    } finally {
      if (isMounted) setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 section-gap w-full bg-black/20 font-display my-12 sm:my-16 md:my-28 md:pt-10 md:pb-12">
      <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20 items-start"
          initial="hide"
          whileInView="show"
          viewport={{ amount: 0.1, margin: "-50px 0px", once: true }}
          variants={containerVariants}
          style={{ willChange: "transform, opacity, filter" }}
        >
          {/* Left Section: Premium Contact Info */}
          <motion.div 
            className="lg:col-span-5 flex flex-col md:gap-10 w-full md:max-w-[640px] md:mx-auto md:text-left lg:max-w-none lg:mx-0"
            variants={leftVariants}
            style={{ willChange: "transform, opacity, filter" }}
          >
            {/* Premium Headline */}
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-2xl md:text-5xl lg:text-6xl leading-none font-semibold tracking-[-0.02em] text-white">
                  Open a
                </p>
                <p className="text-4xl md:text-6xl lg:text-7xl leading-none font-semibold tracking-[-0.02em] text-primary/70">
                  Channel
                </p>
              </div>
              
              {/* Progress Section */}
              <div className="flex flex-col gap-4 max-w-md mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-zinc-500 text-[13px] leading-relaxed">Securing message channel...</p>
                  <p className="text-[12px] font-medium text-primary tracking-[0.12em] uppercase">88%</p>
                </div>
                <div className="rounded-full bg-zinc-900 h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: '88%' }}></div>
                </div>
                
                {/* Premium highlight line */}
                <p className="mt-6 text-zinc-500 text-xs md:text-sm text-center md:text-start">Fast replies • Clear scope • Clean delivery</p>
              </div>
            </div>

            {/* Contact Info Block */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-zinc-500 text-[12px] tracking-[0.18em] uppercase mb-4">Contact</p>
              <p className="text-zinc-500 text-[13px] mt-2 mb-4">Based in Bangladesh • UTC+6</p>
              <div className="space-y-5">
                {/* Address */}
                <div className="flex items-center gap-3">
                  <MapPin className="text-primary/80 text-[18px]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-[14px] leading-relaxed">West Brahmondi, Narsingdi, Bangladesh</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <Mail className="text-primary/80 text-[18px]" />
                  <div className="flex-1 min-w-0">
                    <a 
                      href="mailto:hasanmahdi6060@gmail.com" 
                      className="text-zinc-300 text-[14px] leading-relaxed hover:text-zinc-100 hover:drop-shadow-[0_0_14px_rgba(223,181,42,0.18)] transition-all duration-300"
                    >
                      hasanmahdi6060@gmail.com
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <Phone className="text-primary/80 text-[18px]" />
                  <div className="flex-1 min-w-0">
                    <a 
                      href="tel:01880230924" 
                      className="text-zinc-300 text-[14px] leading-relaxed hover:text-zinc-100 transition-colors"
                    >
                      01880230924
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="mt-8 hidden md:block">
              <p className="text-zinc-500 text-xs font-mono tracking-wide">
                System Status: {
                  isSubmitting 
                    ? 'Sending message...' 
                    : submitStatus === 'success' 
                      ? 'Message sent successfully' 
                      : submitStatus === 'error'
                        ? 'Send failed - please retry'
                        : 'Ready to send'
                }
              </p>
            </div>
          </motion.div>

          {/* Right Section: Premium Contact Form */}
          <motion.div 
            className="lg:col-span-7 w-full md:max-w-[640px] md:mx-auto lg:max-w-none lg:mx-0"
            variants={rightVariants}
            style={{ willChange: "transform, opacity, filter" }}
          >
            <div className="glass-card rounded-2xl p-4 md:p-10 shadow-2xl relative overflow-hidden w-full max-w-full">
              {/* Subtle Background Pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full md:blur-[100px] -mr-32 -mt-32"></div>
              
              <div className="relative z-10 flex flex-col gap-6 md:gap-8 min-w-0">
                <div>
                  <h2 className="text-xl md:text-[38px] leading-[1.1] font-semibold tracking-[-0.02em] text-white mb-2">Send me a message</h2>
                  <p className="text-zinc-500 text-xs md:text-sm leading-relaxed mt-2">Tell me what you’re building — I usually reply within 24 hours.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:gap-6 min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 min-w-0">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="contact-name" className="text-zinc-200 text-sm font-medium mb-2 block">
                        Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full rounded-xl bg-zinc-800/40 border border-white/10 px-2 py-3 md:py-4 text-xs leading-[1.6] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition ${
                          errors.name ? 'border-red-500' : ''
                        }`}
                        placeholder="Full name"
                        type="text"
                      />
                      {errors.name && (
                        <p className="text-red-400 text-xs px-1" role="alert">{errors.name}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label htmlFor="contact-email" className="text-zinc-200 text-sm font-medium mb-2 block">
                        Email
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full rounded-xl bg-zinc-800/40 border border-white/10 px-2 py-3 md:py-4 text-xs leading-[1.6] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition ${
                          errors.email ? 'border-red-500' : ''
                        }`}
                        placeholder="Email address"
                        type="email"
                      />
                      {errors.email && (
                        <p className="text-red-400 text-xs px-1" role="alert">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact-phone" className="text-zinc-200 text-sm font-medium mb-2 block">
                      Phone (optional)
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full rounded-xl bg-zinc-800/40 border border-white/10 px-2 py-3 md:py-4 text-xs leading-[1.6] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
                      placeholder="Phone number (optional)"
                      type="text"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="contact-message" className="text-zinc-200 text-sm font-medium mb-2 block">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      className={`w-full rounded-xl bg-zinc-800/40 border border-white/10 px-2 py-3 md:py-4 text-xs leading-[1.6] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition resize-none min-h-[120px] md:min-h-[160px] max-h-[140px] md:max-h-[170px] ${
                        errors.message ? 'border-red-500' : ''
                      }`}
                      placeholder="How can I help?"
                      rows={5}
                    />
                    {errors.message && (
                      <p className="text-red-400 text-xs px-1" role="alert">{errors.message}</p>
                    )}
                  </div>

                  {/* Honeypot — hidden from humans, catches bots.
                      aria-hidden on the input itself removes it from the
                      accessibility tree without disabling event dispatch,
                      preserving full honeypot functionality. */}
                  <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <input
                      aria-hidden="true"
                      type="text"
                      name="honeypot"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData.honeypot}
                      onChange={handleInputChange}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`mt-4 flex h-10 md:h-14 items-center justify-center rounded-xl text-black text-xs md:text-[13px] tracking-[0.24em] uppercase font-bold transition-all shadow-lg group disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                      isSubmitting 
                        ? 'bg-primary/70 scale-[0.98]' 
                        : submitStatus === 'success'
                          ? 'bg-green-500 scale-[1.02]'
                          : submitStatus === 'error'
                            ? 'bg-red-500 scale-[0.98]'
                            : 'bg-primary hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'
                    }`}
                  >
                    <span>
                      {isSubmitting 
                        ? 'SENDING...' 
                        : submitStatus === 'success'
                          ? 'MESSAGE SENT!'
                          : submitStatus === 'error'
                            ? 'SEND FAILED'
                            : 'SEND MESSAGE'
                      }
                    </span>
                    {!isSubmitting && submitStatus === 'idle' && (
                      <svg 
                        aria-hidden="true"
                        className="w-5 h-5 ml-3 transition-transform group-hover:translate-x-1" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    {isSubmitting && (
                      <svg 
                        aria-hidden="true"
                        className="w-4 h-4 ml-3 animate-spin" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {submitStatus === 'success' && (
                      <svg 
                        aria-hidden="true"
                        className="w-5 h-5 ml-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {submitStatus === 'error' && (
                      <svg 
                        aria-hidden="true"
                        className="w-5 h-5 ml-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default ContactSection