/**
 * /api/og — fallback generated OG image.
 *
 * Moved from src/app/opengraph-image.tsx and src/app/twitter-image.tsx.
 * Those were Next.js special file-based metadata files whose presence caused
 * Next.js to override generateMetadata() image values with the generated image,
 * regardless of what generateMetadata() returned. Renaming to a plain API route
 * removes that override while preserving the generated image as the fallback.
 *
 * layout.tsx generateMetadata() fallback:
 *   ogImageUrl ?? '/api/og'   (instead of /opengraph-image or /twitter-image)
 */
import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/seo'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: '#000000',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Left gold accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '6px',
            height: '100%',
            background: '#D4AF37',
          }}
        />

        {/* Top-right subtle radial glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '480px',
            height: '480px',
            background:
              'radial-gradient(circle at 70% 30%, rgba(212,175,55,0.07) 0%, transparent 60%)',
          }}
        />

        {/* Main content — left-aligned, vertically centered */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: '80px',
            paddingRight: '80px',
            gap: '0px',
          }}
        >
          {/* Eyebrow label */}
          <div
            style={{
              display: 'flex',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#D4AF37',
              marginBottom: '28px',
            }}
          >
            Portfolio
          </div>

          {/* Name */}
          <div
            style={{
              display: 'flex',
              fontSize: '88px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              marginBottom: '24px',
            }}
          >
            {siteConfig.name}
          </div>

          {/* Role */}
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              fontWeight: 500,
              color: '#D4AF37',
              letterSpacing: '0.01em',
              marginBottom: '36px',
            }}
          >
            {siteConfig.jobTitle}
          </div>

          {/* Stack pills */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
            }}
          >
            {['React', 'Next.js', 'Tailwind CSS', 'MERN'].map((tech) => (
              <div
                key={tech}
                style={{
                  display: 'flex',
                  padding: '8px 20px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '999px',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.65)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                {tech}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom-right domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '60px',
            display: 'flex',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.05em',
          }}
        >
          {siteConfig.url.replace('https://', '')}
        </div>

        {/* Bottom-left gold line accent */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '6px',
            width: '200px',
            height: '2px',
            background: 'rgba(212,175,55,0.4)',
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
