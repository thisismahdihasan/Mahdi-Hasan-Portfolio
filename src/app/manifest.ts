import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             siteConfig.applicationName,
    short_name:       'MH',
    description:      siteConfig.description,
    start_url:        '/',
    display:          'standalone',
    background_color: '#000000',
    theme_color:      siteConfig.themeColor,
    icons: [
      {
        src:   '/icon.png',
        sizes: '192x192',
        type:  'image/png',
      },
      {
        src:   '/apple-icon.png',
        sizes: '180x180',
        type:  'image/png',
      },
    ],
  }
}
