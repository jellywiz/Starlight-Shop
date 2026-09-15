import type { Locale } from '@/i18n/config'
import { siteUrl } from '@/lib/env'

/**
 * Canonical public URLs are built from the trusted configured origin (SITE_URL), never
 * from a request Host header (spec section 8 "copied product URLs").
 */
export function canonicalProductUrl(locale: Locale, slug: string): string {
  return `${siteUrl()}/${locale}/products/${encodeURIComponent(slug)}`
}

export function canonicalUrl(locale: Locale, path = ''): string {
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : ''
  return `${siteUrl()}/${locale}${suffix}`
}

/** Home page anchor of the delivery fees section (spec section 2). */
export function deliveryFeesPath(locale: Locale, cityId?: number | null): string {
  const query = cityId ? `?city=${cityId}` : ''
  return `/${locale}${query}#delivery`
}
