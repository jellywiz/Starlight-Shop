import type { MetadataRoute } from 'next'

import { LOCALES, LOCALE_META } from '@/i18n/config'
import { listPublishedProductSlugs } from '@/lib/catalog/queries'
import { siteUrl } from '@/lib/env'

export const dynamic = 'force-dynamic'

/** Published canonical pages only; filtered catalog URLs and admin are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const languagesFor = (path: string) => {
    const languages: Record<string, string> = {}
    for (const code of LOCALES) {
      languages[LOCALE_META[code].htmlLang] = `${base}/${code}${path}`
    }
    languages['x-default'] = `${base}/ckb${path}`
    return languages
  }
  const staticPaths = ['', '/products', '/about', '/contact']
  const entries: MetadataRoute.Sitemap = []
  for (const path of staticPaths) {
    for (const code of LOCALES) {
      entries.push({
        url: `${base}/${code}${path}`,
        changeFrequency: path === '/products' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.8,
        alternates: { languages: languagesFor(path) },
      })
    }
  }
  let products: { slug: string; updatedAt: string }[] = []
  try {
    products = await listPublishedProductSlugs()
  } catch {
    products = []
  }
  for (const product of products) {
    const path = `/products/${product.slug}`
    for (const code of LOCALES) {
      entries.push({
        url: `${base}/${code}${path}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: { languages: languagesFor(path) },
      })
    }
  }
  return entries
}
