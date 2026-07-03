import type { Metadata, Viewport } from 'next'
import { Syne, Manrope } from 'next/font/google'
import './globals.css'
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider'
import CustomCursor from '@/components/CustomCursor'
import { Toaster } from 'react-hot-toast'
import { siteConfig, PersonJsonLd } from '@/lib/seo'

const syne = Syne({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default:  siteConfig.title,
    template: siteConfig.titleTemplate,
  },
  description:     siteConfig.description,
  applicationName: siteConfig.applicationName,
  authors:         [{ name: siteConfig.name, url: siteConfig.url }],
  creator:         siteConfig.creator,
  publisher:       siteConfig.publisher,
  category:        siteConfig.category,
  keywords:        siteConfig.keywords,
  alternates: {
    canonical: '/',
  },
  robots: {
    index:               true,
    follow:              true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-image-preview':  'large',
      'max-snippet':        -1,
      'max-video-preview':  -1,
    },
  },
  openGraph: {
    type:        'website',
    locale:      siteConfig.locale,
    url:         siteConfig.url,
    siteName:    siteConfig.applicationName,
    title:       siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url:    '/opengraph-image',
        width:  1200,
        height: 630,
        alt:    `${siteConfig.name} — ${siteConfig.jobTitle}`,
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       siteConfig.title,
    description: siteConfig.description,
    images:      ['/twitter-image'],
    creator:     '@mahdihasan',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png'     },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor:    siteConfig.themeColor,
  width:         'device-width',
  initialScale:  1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${syne.variable} ${manrope.variable} antialiased bg-black`} suppressHydrationWarning>
        {/* Skip-to-content — visually hidden until focused, first tab stop on every page */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[99999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#D4AF37] focus:text-black focus:font-semibold focus:text-sm focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <PersonJsonLd />
        <div className="relative min-h-screen flex flex-col">
          <CustomCursor />
          <SmoothScrollProvider>
            <div className="relative z-10 flex-1">
              {children}
            </div>
          </SmoothScrollProvider>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '12px',
            },
            success: {
              iconTheme: {
                primary: 'rgb(207 174 82)',
                secondary: '#000000',
              },
            },
          }}
        />
      </body>
    </html>
  )
}