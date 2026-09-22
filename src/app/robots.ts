import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Robots rules complement authorization; they never replace it (spec section 15).
        disallow: ['/admin', '/api/', '/*/products/*/preview', '/*/products?*'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
