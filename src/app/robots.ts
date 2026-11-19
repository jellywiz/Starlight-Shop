import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/*/products?category='],
        // Robots rules complement authorization; they never replace it (spec section 15).
        // Filtered catalogue URLs are not crawled, except single-category landing pages:
        // the longer `allow` rule wins over `/*/products?*` (docs/decisions.md).
        disallow: ['/admin', '/api/', '/*/products/*/preview', '/*/products?*'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
