/**
 * SEO helpers — single source of truth for site identity, metadata, and JSON-LD.
 * Used by layout.tsx (metadata export) and PersonJsonLd (structured data).
 * Never import this in client components — server-only.
 */

export const siteConfig = {
  name:            'Mahdi Hasan',
  alternateName:   'thisismahdihasan',

  title:           'Mahdi Hasan | Junior Full Stack Developer',
  titleTemplate:   '%s | Mahdi Hasan',

  description:
    'Junior Full Stack Developer focused on scalable backend systems and modern web applications using Node.js, Express.js, PostgreSQL, Prisma, Socket.IO, React, Next.js, and TypeScript.',

  url:             'https://thisismahdihasan.com',

  applicationName: 'Mahdi Hasan Portfolio',

  creator:         'Mahdi Hasan',
  publisher:       'Mahdi Hasan',

  category:        'technology',

  jobTitle:        'Junior Full Stack Developer',

  keywords: [
    'Mahdi Hasan',
    'thisismahdihasan',
    'Junior Full Stack Developer',
    'Full Stack Developer',
    'Backend Developer',
    'Node.js',
    'Express.js',
    'PostgreSQL',
    'Prisma',
    'Socket.IO',
    'React',
    'Next.js',
    'TypeScript',
    'JavaScript',
    'REST API',
    'Portfolio',
    'Bangladesh Developer',
  ],

  social: {
    linkedin:  'https://www.linkedin.com/in/thisismahdihasan/',
    github:    'https://github.com/thisismahdihasan/',
    facebook:  'https://www.facebook.com/thisismahdihasan/',
    instagram: 'https://www.instagram.com/thisismahdihasan/',
    threads:   'https://www.threads.net/@thisismahdihasan',
    x:         'https://x.com/thisismahdix',
    tiktok:    'https://www.tiktok.com/@thisismahdihasan',
  },

  locale:     'en_US',
  themeColor: '#D4AF37',
}

/**
 * PersonJsonLd — renders JSON-LD structured data for Google rich results.
 * Place once inside <body> in the root layout.
 * Schema: Person + WebSite
 */
export function PersonJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id':   `${siteConfig.url}/#person`,

        name:          siteConfig.name,
        alternateName: siteConfig.alternateName,

        url:   siteConfig.url,
        image: `${siteConfig.url}/api/og-image`,

        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id':   `${siteConfig.url}/#webpage`,
        },

        jobTitle:    siteConfig.jobTitle,
        description: siteConfig.description,

        knowsAbout: [
          'Node.js',
          'Express.js',
          'PostgreSQL',
          'Prisma',
          'Socket.IO',
          'React',
          'Next.js',
          'TypeScript',
          'JavaScript',
          'REST APIs',
          'Backend Development',
          'Full Stack Development',
          'Web Application Architecture',
        ],

        sameAs: [
          siteConfig.social.linkedin,
          siteConfig.social.github,
          siteConfig.social.facebook,
          siteConfig.social.instagram,
          siteConfig.social.x,
          siteConfig.social.tiktok,
        ],
      },
      {
        '@type': 'WebSite',
        '@id':   `${siteConfig.url}/#website`,

        url:         siteConfig.url,
        name:        siteConfig.applicationName,
        description: siteConfig.description,
        inLanguage:  'en-US',

        author: {
          '@id': `${siteConfig.url}/#person`,
        },

        publisher: {
          '@id': `${siteConfig.url}/#person`,
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
