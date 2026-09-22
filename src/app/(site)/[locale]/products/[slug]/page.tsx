import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { CatalogUnavailable } from '@/components/site/CatalogUnavailable'
import { ProductView } from '@/components/site/ProductView'
import { isLocale, type Locale } from '@/i18n/config'
import { type Dictionary, getDictionary } from '@/i18n/dictionary'
import {
  getProductBySlug,
  getRelatedProducts,
  getShopSettings,
  resolveRedirect,
} from '@/lib/catalog/queries'
import { type CatalogItem, CatalogUnavailableError, type ProductDetail } from '@/lib/catalog/types'
import { dropFromCacheAfterResponse } from '@/lib/site/outage'
import { SLUG_RE, productMetadata } from '@/lib/site/product'

/**
 * Served from the cache (docs/decisions.md "Performance"): rendered on the first visit,
 * kept by the CDN, and re-rendered after the owner changes anything (src/hooks/revalidate.ts).
 * The day-long limit is only a safety net. The owner's draft preview is a separate,
 * always-fresh route: ./preview. Nothing is rendered at build time (no database there):
 * the empty list makes unknown products render on first request and then stay cached.
 */
export const revalidate = 86400
export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ locale: string; slug: string }> }

type Loaded = { product: ProductDetail } | { redirectTo: string } | { unavailable: true } | null

async function load(locale: Locale, slug: string): Promise<Loaded> {
  if (!SLUG_RE.test(slug)) {
    return null
  }
  try {
    const product = await getProductBySlug(slug, locale)
    if (product) {
      return { product }
    }
    const target = await resolveRedirect(slug)
    return target ? { redirectTo: `/${locale}/products/${target}` } : null
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      return { unavailable: true }
    }
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) {
    return {}
  }
  const dict = getDictionary(locale)
  const loaded = await load(locale, slug)
  if (!loaded || !('product' in loaded)) {
    return { title: dict.meta.notFoundTitle, robots: { index: false } }
  }
  return productMetadata(locale, dict, loaded.product, false)
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) {
    notFound()
  }
  const dict: Dictionary = getDictionary(locale)
  // The product and the settings are independent (and the settings are shared with the
  // layout), so they load together.
  const [loaded, { settings, fromFallback }] = await Promise.all([
    load(locale, slug),
    getShopSettings(locale),
  ])
  if (loaded === null) {
    notFound()
  }
  if ('redirectTo' in loaded) {
    permanentRedirect(loaded.redirectTo)
  }
  // A database outage must never be frozen into the cache. This route is cached (ISR)
  // and cannot opt out per request, so any render touched by the outage — the outage
  // state itself, fallback settings, missing neighbours — is dropped from the cache as
  // soon as it has been sent (src/lib/site/outage.ts).
  const path = `/${locale}/products/${slug}`
  if (fromFallback) {
    dropFromCacheAfterResponse(path)
  }
  if ('unavailable' in loaded) {
    dropFromCacheAfterResponse(path)
    return <CatalogUnavailable dict={dict} settings={settings} />
  }
  const { product } = loaded

  let related: CatalogItem[] = []
  try {
    related = await getRelatedProducts(product, locale)
  } catch {
    dropFromCacheAfterResponse(path)
  }

  return (
    <ProductView
      product={product}
      related={related}
      settings={settings}
      locale={locale}
      dict={dict}
      preview={false}
    />
  )
}
