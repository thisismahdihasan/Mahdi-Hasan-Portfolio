/**
 * SEO helpers — single source of truth for site identity, metadata, and JSON-LD.
 * Used by layout.tsx (metadata export) and PersonJsonLd (structured data).
 * Never import this in client components — server-only.
 */

export const siteConfig = {
  name:            'Mahdi Hasan',
  title:           'Mahdi Hasan | Junior Frontend Developer',
  titleTemplate:   '%s | Mahdi Hasan',
  description:
    'Junior Frontend Developer specializing in React, Next.js, and Tailwind CSS. ' +
    'Building clean, responsive web applications with the MERN stack. ' +
    'Open to roles and freelance projects.',
  url:             'https://thisismahdihasan.com',
  applicationName: 'Mahdi Hasan Portfolio',
  creator:         'Mahdi Hasan',
  publisher:       'Mahdi Hasan',
  category:        'technology',
  jobTitle:        'Junior Frontend Developer',
  keywords: [
    'Mahdi Hasan',
    'Frontend Developer',
    'React Developer',
    'Next.js Developer',
    'Tailwind CSS',
    'MERN Stack',
    'JavaScript',
    'TypeScript',
    'Web Developer Bangladesh',
    'Portfolio',
  ],
  social: {
    linkedin: 'https://www.linkedin.com/in/mahdi9162/',
    github:   'https://github.com/mahdi9162',
    facebook: 'https://www.facebook.com/mahdi916/',
  },
  locale: 'en_US',
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
        name:       siteConfig.name,
        url:        siteConfig.url,
        jobTitle:   siteConfig.jobTitle,
        description: siteConfig.description,
        knowsAbout: [
          'React',
          'Next.js',
          'Tailwind CSS',
          'JavaScript',
          'TypeScript',
          'Node.js',
          'Express',
          'MongoDB',
          'MERN Stack',
          'Responsive Web Design',
          'REST APIs',
        ],
        sameAs: [
          siteConfig.social.linkedin,
          siteConfig.social.github,
          siteConfig.social.facebook,
        ],
      },
      {
        '@type': 'WebSite',
        '@id':   `${siteConfig.url}/#website`,
        url:     siteConfig.url,
        name:    siteConfig.applicationName,
        description: siteConfig.description,
        author: {
          '@id': `${siteConfig.url}/#person`,
        },
        inLanguage: 'en-US',
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
